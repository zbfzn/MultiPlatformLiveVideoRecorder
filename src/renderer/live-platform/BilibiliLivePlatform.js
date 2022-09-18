import LivePlatform from './live-platform.js'
import HttpUtil from '../utils/http-util.js'
import qs from 'query-string'

class BilibiliLivePlatform extends LivePlatform {
  constructor () {
    super()
    this.httpHeaders = {
      'User-Agent': this.pcUserAgent,
      'referer': 'https://live.bilibili.com'
    }
  }
  getUserInfo (idOrUrl) {
    return new Promise(async (resolve, reject) => {
      let roomId = idOrUrl
      if (this.isUrl(idOrUrl)) {
        roomId = new RegExp('https?://live.bilibili.com/(\\d+)').exec(idOrUrl)[1]
      }
      try {
        const roomInitUrl = `https://api.live.bilibili.com/room/v1/Room/room_init?id=${roomId}`
        let roomInitInfoRes = await HttpUtil.get(roomInitUrl, this.httpHeaders)
        // 获取真实房间号
        if (roomInitInfoRes.data.msg === '直播间不存在') {
          reject(new Error('直播间不存在'))
          return
        }
        const realRoomId = roomInitInfoRes.data.data.room_id
        const roomInfoUrl = `https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${realRoomId}`
        let roomInfoRes = await HttpUtil.get(roomInfoUrl, this.httpHeaders)
        const userName = roomInfoRes.data.data.anchor_info.base_info.uname
        resolve({
          id: roomId,
          idShow: roomId,
          name: userName,
          roomId: roomId
        })
      } catch (e) {
        reject(e)
      }
    })
  }
  check (user, preferenceQuality, preferenceChannel) {
    // 调用方法前保证idOrUrl是id
    return new Promise(async (resolve, reject) => {
      try {
        const roomInitUrl = `https://api.live.bilibili.com/room/v1/Room/room_init?id=${user.id}`
        let roomInitInfoRes = await HttpUtil.get(roomInitUrl, this.httpHeaders)
        // 获取真实房间号
        if (roomInitInfoRes.data.msg === '直播间不存在') {
          reject(new Error('直播间不存在'))
          return
        } else if (roomInitInfoRes.data.data.live_status !== 1) {
          // 未开播
          resolve()
          return
        }
        const realRoomId = roomInitInfoRes.data.data.room_id
        const roomInfoUrl = `https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${realRoomId}`
        let roomInfoRes = await HttpUtil.get(roomInfoUrl, this.httpHeaders)
        const title = roomInfoRes.data.data.room_info.title
        // 获取直播流数据
        const usableQualityValues = await this.getUsableQualities(realRoomId)
        // 最优清晰度（没有设置的最高清晰度依次向下类推）
        const realQuality = LivePlatform.getPreference('value', 'orderIndex', BilibiliLivePlatform.defaultConfig.qualities, usableQualityValues, preferenceQuality.value)
        if (!realQuality) {
          reject(new Error('无可用清晰度'))
        }
        const realChannel = preferenceChannel
        const streamUrl = await this.getStreamUrl(realRoomId, realQuality.value)
        // 使用浏览器头会403
        const result = {
          streamUrl: streamUrl,
          ffmpegCommandOutputOption: {
            '-headers': `User-Agent: PostmanRuntime/7.28.4`,
            '-i': streamUrl,
            '-v': 'trace',
            '-c': 'copy',
            '-flvflags': 'add_keyframe_index'
          },
          title: title,
          quality: realQuality,
          channel: realChannel
        }
        resolve(result)
        console.log(result)
      } catch (e) {
        reject(e)
      }
    })
  }

  // ********************************重写方法分割**************************** //
  getUsableQualities (realRoomId) {
    return new Promise(async (resolve, reject) => {
      try {
        const param = qs.stringify({
          'room_id': realRoomId,
          'protocol': '0,1',
          'format': '0,1,2',
          'codec': '0,1',
          'qn': 10000,
          'platform': 'h5',
          'ptype': 8
        })
        let res = await HttpUtil.get('https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?' + param, this.httpHeaders)
        let streamInfo = res.data.data.playurl_info.playurl.stream
        let stream = null
        for (const sm of streamInfo) {
          if (sm.protocol_name === 'http_stream') {
            stream = sm
            break
          }
        }
        if (!stream) {
          reject(new Error('获取直播流信息失败'))
          return
        }
        resolve(stream.format[0].codec[0].accept_qn)
      } catch (e) {
        reject(e)
      }
    })
  }
  getStreamUrl (realRoomId, qn) {
    return new Promise(async (resolve, reject) => {
      try {
        const param = qs.stringify({
          'room_id': realRoomId,
          'protocol': '0,1',
          'format': '0,1,2',
          'codec': '0,1',
          'qn': qn,
          'platform': 'h5',
          'ptype': 8
        })
        let res = await HttpUtil.get('https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?' + param, this.httpHeaders)
        let streamInfo = res.data.data.playurl_info.playurl.stream
        let stream = null
        for (const sm of streamInfo) {
          if (sm.protocol_name === 'http_stream') {
            stream = sm
            break
          }
        }
        if (!stream) {
          reject(new Error('获取直播流信息失败'))
          return
        }
        const baseUrl = stream.format[0].codec[0].base_url
        const urlInfo = stream.format[0].codec[0].url_info[0]
        resolve(`${urlInfo.host}${baseUrl}${urlInfo.extra}`)
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
BilibiliLivePlatform.getUserRoomOrHomeUrl = function (user) {
  return 'https://live.bilibili.com/' + user.id
}

/**
 * 检查是否支持
 **/
BilibiliLivePlatform.isSupportedUrl = function (url) {
  return /https?:\/\/live\.bilibili\.com\/.*/.test(url)
}

// qn=150高清 qn=250超清 qn=400蓝光 qn=10000原画
BilibiliLivePlatform.platformInfo = {
  code: 'bilibii',
  name: '哔哩哔哩',
  website: 'https://live.bilibili.com'
}
BilibiliLivePlatform.defaultConfig = {
  qualities: [
    {
      code: 'GQ',
      name: '高清',
      value: 150,
      orderIndex: 1
    },
    {
      code: 'CQ',
      name: '超清',
      value: 250,
      orderIndex: 2
    },
    {
      code: 'LG',
      name: '蓝光',
      value: 400,
      orderIndex: 3
    },
    {
      code: 'YH',
      name: '原画',
      value: 10000,
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
  defaultQualityCode: 'YH',
  defaultChannelCode: 'DEFAULT',
  idPlaceholder: '请输入直播间地址或房间号',
  dynamicRoomId: false
}
export default BilibiliLivePlatform
