import LivePlatform from './live-platform.js'
import HttpUtil from '../utils/http-util.js'
// 斗鱼加签算法内部需要
import CryptoJS from 'crypto-js'
import uuid4 from 'uuid/v4'
import {VM} from 'vm2'
import qs from 'query-string'

// 因为斗鱼的sign混淆中会去验证一些window/document的函数是否是native的 (以此判断是否是浏览器环境), 所以这里直接proxy返回
const disguisedNative = new Proxy({}, {
  get: function (target, name) {
    return 'function () { [native code] }'
  }
})

/**
 * 获取斗鱼sign加签函数（动态）
 * @param rid
 * @return {Promise<any>}
 */
function getSignFn (rid) {
  return new Promise(async (resolve, reject) => {
    try {
      let res = await HttpUtil.get('https://www.douyu.com/swf_api/homeH5Enc?rids=' + rid)
      let json = res.data
      if (json.error !== 0) reject(new Error('Unexpected error code, ' + json.error))
      let code = json.data && json.data['room' + rid]
      if (!code) reject(new Error('Unexpected result with homeH5Enc, ' + JSON.stringify(json)))

      // 使用VM2沙箱环境运行加签函数
      const vm = new VM({
        sandbox: {
          CryptoJS: CryptoJS,
          window: disguisedNative,
          document: disguisedNative
        }
      })
      resolve(vm.run(code + ';ub98484234'))
    } catch (e) {
      reject(e)
    }
  })
}

/*
两个阿里的CDN：
    dyscdnali1.douyucdn.cn
    dyscdnali3.douyucdn.cn
 */
class DouyuLivePlatform extends LivePlatform {
  constructor () {
    super()
    this.httpHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': this.pcUserAgent
    }
  }
  getId (idOrUrl) {
    if (!this.isUrl(idOrUrl)) {
      return idOrUrl
    } else {
      return idOrUrl.indexOf('?') > -1 ? new RegExp('https?://(?:www\\.|m\\.|)douyu.com/[^?]*\\?rid=([^&]+)', 'g').exec(idOrUrl)[1] : new RegExp('https?://(?:www\\.|m\\.|)douyu.com/([^/?]+)', 'g').exec(idOrUrl)[1]
    }
  }
  getUserInfo (idOrUrl) {
    return new Promise(async (resolve, reject) => {
      try {
        let url = idOrUrl
        if (!this.isUrl(idOrUrl)) {
          url = `https://www.douyu.com/${idOrUrl}`
        }
        let res = await HttpUtil.get(url, this.httpHeaders)
        let userName = new RegExp('<div class="Title-anchorName" title="([^<>]+)">', 'g').exec(res.data)[1]
        let id = this.getId(idOrUrl)
        let user = {
          id: id,
          idShow: id,
          name: userName,
          roomId: id
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
        let roomId = user.id
        const resHome = await HttpUtil.get('https://m.douyu.com/' + user.id, this.httpHeaders)
        // roomIndexHtml = res.data
        let re = new RegExp('rid":(\\d{1,8}),"vipId', 'g')
        let findArr = re.exec(resHome.data)
        if (findArr.length > 1) {
          roomId = findArr[1]
        }
        const resHomePc = await HttpUtil.get('https://www.douyu.com/' + user.id, this.httpHeaders)
        if (resHomePc.status === 404) {
          reject(new Error('直播间不存在'))
        }
        const findTitle = new RegExp('class="Title-header"[^<>]*>([^<>]+)</', 'g').exec(resHomePc.data)
        const title = findTitle && findTitle.length > 0 ? findTitle[1] : ''
        // 加签获取清晰度、直播流信息
        let did = uuid4().replace(/-/g, '')
        let t10 = String(Math.floor(Date.now().valueOf() / 1000))
        // 获取直播流（预览接口）
        // 动态获取加签算法
        const sign = await getSignFn(roomId)
        const postData = sign(roomId, did, t10)
        const url = `https://playweb.douyu.com/lapi/live/getH5Play/${roomId}`
        const res = await HttpUtil.post(url, postData, this.httpHeaders)
        if (!res.data.data.rtmp_live) {
          resolve()
          return
        }
        const qualities = res.data.data.multirates
        const usableQualityNameMap = []
        for (const quality of qualities) {
          usableQualityNameMap[quality.name] = quality
        }
        // 最优清晰度（没有设置的最高清晰度依次向下类推）, bit会变，rate不唯一，使用name匹配
        let realQuality = LivePlatform.getPreference('name', 'orderIndex', DouyuLivePlatform.defaultConfig.qualities, Object.keys(usableQualityNameMap), preferenceQuality.name)
        if (!realQuality) {
          reject(new Error('无可用清晰度'))
        }
        let realQualityUsed = {
          ...realQuality
        }
        // 使用rate获取对应清晰度的直播流地址
        realQualityUsed.value = usableQualityNameMap[realQualityUsed.name].rate
        const realChannel = preferenceChannel

        // 获取指定清晰度和线路的直播流地址
        did = uuid4().replace(/-/g, '')
        t10 = String(Math.floor(Date.now().valueOf() / 1000))
        const postSignData = qs.stringify(Object.assign({}, qs.parse(sign(roomId, did, t10)), {
          cdn: realChannel.value,
          rate: realQualityUsed.value || 0,
          iar: 0,
          ive: 0
        }))
        const preferenceStreamInfo = await HttpUtil.post(`https://www.douyu.com/lapi/live/getH5Play/${roomId}`, postSignData, this.httpHeaders)
        const streamUrl = preferenceStreamInfo.data.data.rtmp_url + '/' + preferenceStreamInfo.data.data.rtmp_live
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
          quality: realQualityUsed,
          channel: realChannel
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
DouyuLivePlatform.getUserRoomOrHomeUrl = function (user) {
  return 'https://www.douyu.com/' + user.id
}

/**
 * 检查是否支持
 **/
DouyuLivePlatform.isSupportedUrl = function (url) {
  return /https?:\/\/(m|www)\.douyu\.com\/.*/.test(url)
}

// （原画1080P60: 10060, 蓝光4M：4000，超清：2000，高清：900）
DouyuLivePlatform.platformInfo = {
  code: 'douyu',
  name: '斗鱼TV',
  website: 'https://www.douyu.com'
}
DouyuLivePlatform.defaultConfig = {
  qualities: [
    {
      code: 'GQ',
      name: '高清',
      value: '900',
      orderIndex: 1
    },
    {
      code: 'CQ',
      name: '超清',
      value: '2000',
      orderIndex: 2
    },
    {
      code: 'LG-4M',
      name: '蓝光4M',
      value: '4000',
      orderIndex: 3
    },
    {
      code: 'YH-480P20',
      name: '原画480P20',
      value: null,
      orderIndex: 4
    },
    {
      code: 'YH-480P30',
      name: '原画480P30',
      value: null,
      orderIndex: 5
    },
    {
      code: 'YH-720P20',
      name: '原画720P20',
      value: null,
      orderIndex: 6
    },
    {
      code: 'YH-720P30',
      name: '原画720P30',
      value: null,
      orderIndex: 7
    },
    {
      code: 'YH-1080P10',
      name: '原画1080P10',
      value: null,
      orderIndex: 8
    },
    {
      code: 'YH-1080P20',
      name: '原画1080P20',
      value: null,
      orderIndex: 9
    },
    {
      code: 'YH-1080P30',
      name: '原画1080P30',
      value: null,
      orderIndex: 10
    },
    {
      code: 'YH-1080P40',
      name: '原画1080P40',
      value: null,
      orderIndex: 11
    },
    {
      code: 'YH-1080P50',
      name: '原画1080P50',
      value: null,
      orderIndex: 12
    },
    {
      code: 'YH-1080P60',
      name: '原画1080P60',
      value: null,
      orderIndex: 13
    }
  ],
  channels: [
    {
      code: 'TENCENT',
      name: '腾讯云',
      value: 'tct',
      orderIndex: 1
    },
    {
      code: 'TENCENT-H5',
      name: '腾讯云-H5',
      value: 'tct-h5',
      orderIndex: 2
    },
    {
      code: 'ZHUXIAN-WANGXIU',
      name: '主线 (网宿)',
      value: 'ws',
      orderIndex: 3
    },
    {
      code: 'ZHUXIAN-WANGXIU-H5',
      name: '主线-H5 (网宿)',
      value: 'ws-h5',
      orderIndex: 4
    },
    {
      code: 'ALI-H5',
      name: '阿里云-H5',
      value: 'ali-h5',
      orderIndex: 5
    },
    {
      code: 'WANGXIU-2',
      name: '网宿2',
      value: 'ws2',
      orderIndex: 6
    }, {
      code: 'DILIAN',
      name: '帝联',
      value: 'dl',
      orderIndex: 7
    }
  ],
  defaultQualityCode: 'YH-1080P60',
  defaultChannelCode: 'TENCENT',
  idPlaceholder: '请输入直播间地址或房间号',
  dynamicRoomId: false
}
export default DouyuLivePlatform
