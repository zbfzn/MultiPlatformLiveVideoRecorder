import LivePlatform from './live-platform.js'
import HttpUtil from '../utils/http-util.js'
// 借助electron 窗口管理，打开一个隐藏窗口获取抖音房间信息，跳过反扒，后续可以分析反扒代码替换掉
import IpcChannel from '../../helper/IpcChannel'
import ipcRendererUtil from '../../helper/ipcRendererUtil'

function getRoomDataFromWindow (liveUrl) {
  return new Promise((resolve, reject) => {
    // 通知主进程启动新窗口获取房间信息
    const listener = (event, url_, success, data) => {
      if (liveUrl === url_) {
        if (success) {
          resolve(data)
        } else {
          reject(new Error('获取直播流信息失败'))
        }
        ipcRendererUtil.removeListener(IpcChannel.getDouyinRoomDataReply, listener)
      }
    }
    ipcRendererUtil.on(IpcChannel.getDouyinRoomDataReply, listener)
    ipcRendererUtil.sendToMain(IpcChannel.getDouyinRoomData, liveUrl)
  })
}

class DouyinLivePlatform extends LivePlatform {
  constructor () {
    super()
    this.httpHeaders = {
      'Content-Type': 'application/x-www-from-urlencoded',
      'User-Agent': this.pcUserAgent
    }
  }
  getUserInfo (idOrUrl) {
    return new Promise(async (resolve, reject) => {
      try {
        let url = idOrUrl
        if (!this.isUrl(idOrUrl)) {
          url = `https://www.douyin.com/user/${idOrUrl}?previous_page=app_code_link`
        }
        let id = null
        try {
          id = new RegExp('(?:/user/|sec_uid=)([^/&?]*)(?:$|\\?|&)', 'g').exec(idOrUrl)[1]
        } catch (e) {
          //
        }
        if (!id) {
          let res = await HttpUtil.post(url, this.httpHeaders)
          // 获取sec_uid
          id = new RegExp('(?:/user/|sec_uid=)([^/&?]*)(?:$|\\?|&)', 'g').exec(res.request.responseURL)[1]
        }
        let resReal = await HttpUtil.post(`https://www.douyin.com/user/${id}?previous_page=app_code_link`, null, this.httpHeaders)
        // 获取用户页，获取用户名
        let userName = new RegExp('(?:<span>){4}([^<>]+)(?:</span>){4}', 'g').exec(resReal.data)[1]
        let douId = new RegExp(/抖音号： <!-- -->([^<>]+)/g).exec(resReal.data)[1]
        let user = {
          id: id,
          idShow: douId,
          name: userName,
          roomId: null
        }
        console.log(user)
        resolve(user)
      } catch (e) {
        reject(e)
      }
    })
  }
  check (user, preferenceQuality, preferenceChannel) {
    return new Promise(async (resolve, reject) => {
      try {
        let roomInfo
        // 抖音关闭手机端web直播页，故放弃
        // if (user.roomId) {
        //   const exchangeData = {
        //     config: {
        //       url: `https://webcast.amemv.com/webcast/reflow/${user.roomId}`,
        //       method: 'get',
        //       headers: {
        //         'User-Agent': this.phoneUserAgent
        //       }
        //     }
        //   }
        //   // 手机端web页获取,调用转发服务获取手机端页面数据
        //   const res = await HttpUtil.postExchange(exchangeData)
        //   const re = new RegExp('window.__INIT_PROPS__ = ([^<]*)</script>')
        //   const find = re.exec(res.data)
        //   roomInfo = JSON.parse(find[1])['/webcast/reflow/:id']['room']
        //   if (roomInfo.status !== 2 && roomInfo.status !== 4) {
        //     resolve()
        //     return
        //   } else if (roomInfo.status === 4) {
        //     // 已开播，但直播间房间号已改变
        //     roomInfo = null
        //   }
        // }
        if (!roomInfo) {
          // 没有app端房间id，使用web端直播页获取（可能需要验证码验证）
          let webRid = null
          // 采用post（不是get就行）避开抖音安全校验, 获取用户房间信息
          const res = await HttpUtil.post(`https://www.douyin.com/user/${user.id}?previous_page=app_code_link`, null, this.httpHeaders)
          const re = new RegExp('<script id="RENDER_DATA" type="application/json">\\s*([^<\\s]*)', 'g')
          const dataString = re.exec(res.data)[1]
          const data = JSON.parse(decodeURIComponent(dataString))
          let roomData = null
          for (var key in data) {
            try {
              if (data.hasOwnProperty(key)) {
                roomData = data[key].user.user.roomData
              }
              break
            } catch (ignore) {
            }
          }
          if (!roomData || Object.keys(roomData).length === 0) {
            // 未开播
            resolve()
            return
          }
          // web页直播间id
          webRid = roomData.owner.web_rid
          // 生成直播地址
          const liveUrl = `https://live.douyin.com/${webRid}?enter_from_merge=web_others_homepage&enter_method=web_live_btn&room_id=`
          const streamDataStr = await getRoomDataFromWindow(liveUrl)
          const streamData = JSON.parse(streamDataStr)
          if (streamData.initialState) {
            roomInfo = streamData.initialState.roomStore.roomInfo.room
          } else if (streamData.app) {
            roomInfo = streamData.app.initialState.roomStore.roomInfo.room
          } else {
            reject(new Error('获取房间信息错误！'))
            return
          }
        }
        roomInfo.appRoomId = roomInfo.id_str
        const title = roomInfo.title
        // 支持语音直播：已知：live_room_mode - [0]: 视频直播；[3]: 语音直播, 不支持多人聊天直播模式
        if (roomInfo.live_room_mode === 3) {
          // 语音直播, 使用手机端web页面获取，使用app端房间id
          const exchangeDataForAudioLive = {
            config: {
              url: `https://webcast.amemv.com/webcast/reflow/${roomInfo.appRoomId}`,
              method: 'get',
              headers: {
                'User-Agent': this.phoneUserAgent
              }
            }
          }
          // 手机端web页获取,调用转发服务获取手机端页面数据
          const res = await HttpUtil.postExchange(exchangeDataForAudioLive)
          const re = new RegExp('window.__INIT_PROPS__ = ([^<]*)</script>')
          const find = re.exec(res.data)
          roomInfo = JSON.parse(find[1])['/webcast/reflow/:id']['room']
        }
        const flvUrl = roomInfo.stream_url.flv_pull_url
        const qualityKeys = Object.keys(flvUrl)
        const realQuality = DouyinLivePlatform.getPreference('value', 'orderIndex', DouyinLivePlatform.defaultConfig.qualities, qualityKeys, preferenceQuality.value)
        if (!realQuality) {
          reject(new Error('无可用清晰度'))
        }
        const realChannel = preferenceChannel
        const streamUrl = flvUrl[realQuality.value]
        const result = {
          streamUrl: streamUrl,
          ffmpegCommandOutputOption: {
            '-headers': `User-Agent: ${this.pcUserAgent}`,
            '-i': streamUrl,
            '-v': 'trace',
            '-c': 'copy',
            '-flvflags': 'add_keyframe_index'
          },
          title: title,
          quality: realQuality,
          channel: realChannel,
          // app端的房间id
          roomId: roomInfo.appRoomId
        }
        resolve(result)
      } catch (e) {
        reject(e)
      }
    })
  }
}
/**
 * 获取用户房间地址或主页地址
 * @param user 用户信息
 */
DouyinLivePlatform.getUserRoomOrHomeUrl = function (user) {
  return 'https://www.douyin.com/user/' + user.id
}

/**
 * 检查是否支持
 **/
DouyinLivePlatform.isSupportedUrl = function (url) {
  return /https?:\/\/www\.douyin\.com\/user\/.*/.test(url)
}

DouyinLivePlatform.platformInfo = {
  code: 'douyin',
  name: '抖音',
  website: 'https://www.douyin.com'
}
DouyinLivePlatform.defaultConfig = {
  qualities: [
    {
      code: 'BQ',
      name: '标清',
      value: 'SD1',
      orderIndex: 1
    },
    {
      code: 'GQ',
      name: '高清',
      value: 'SD2',
      orderIndex: 2
    },
    {
      code: 'CQ',
      name: '超清',
      value: 'HD1',
      orderIndex: 3
    },
    {
      code: 'LG',
      name: '蓝光(原画)',
      value: 'FULL_HD1',
      orderIndex: 4
    }
  ],
  channels: [
    {
      code: 'DEFAULT',
      name: '线路1',
      value: null,
      orderIndex: 1
    }
  ],
  defaultQualityCode: 'LG',
  defaultChannelCode: 'DEFAULT',
  idPlaceholder: '请输入抖音用户主页地址或sec_uid',
  dynamicRoomId: true
}

export default DouyinLivePlatform
