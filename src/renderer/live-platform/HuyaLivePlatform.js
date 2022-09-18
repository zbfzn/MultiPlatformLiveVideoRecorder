import LivePlatform from './live-platform.js'
import HttpUtil from '../utils/http-util.js'
import CryptoJS from 'crypto-js'

class HuyaLivePlatform extends LivePlatform {
  constructor () {
    super()
    this.httpHeaders = {
      'User-Agent': this.pcUserAgent
    }
    this.phoneHttpHeaders = {
      'User-Agent': this.phoneUserAgent
    }
  }

  getId (idOrUrl) {
    return !this.isUrl(idOrUrl) ? idOrUrl : new RegExp('https?://(?:www\\.|m\\.|)huya.com/([^/?]+)').exec(idOrUrl)[1]
  }

  getUserInfo (idOrUrl) {
    return new Promise(async (resolve, reject) => {
      let url = idOrUrl
      if (!this.isUrl(idOrUrl)) {
        url = 'https://www.huya.com/' + idOrUrl
      }
      try {
        let res = await HttpUtil.get(url, this.httpHeaders)
        let userName = new RegExp('<h3 class="host-name" title="([^<>]+)">').exec(res.data)[1]
        let roomId = this.getId(idOrUrl)
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
        // 获取直播流数据, 难在直播流地址生成
        const res = (await HttpUtil.postExchange({
          config: {
            url: 'https://m.huya.com/' + user.id,
            method: 'get',
            headers: this.phoneHttpHeaders
          }
        }))
        const re = /window.HNF_GLOBAL_INIT\s*=\s*([^<]*)/
        const find = re.exec(res.data)
        if (!find || find.length === 0) {
          reject(new Error('获取房间信息错误'))
          return
        }
        // title
        const pcHtmlRes = await HttpUtil.get('https://www.huya.com/' + user.id, this.httpHeaders)
        const findTitle = new RegExp('id="J_roomTitle"[^>]*>([^<>]+)</h1>', 'g').exec(pcHtmlRes.data)
        const title = findTitle && findTitle.length > 0 ? findTitle[1] : ''
        const data = JSON.parse(find[1]).roomInfo.tLiveInfo.tLiveStreamInfo
        if (!data.vBitRateInfo.value || data.vBitRateInfo.value.length === 0) {
          // 未开播
          resolve()
          return
        }
        // 清晰度选择
        let usableQualityValues = []
        for (let q of data.vBitRateInfo.value) {
          usableQualityValues.push(q.iBitRate)
        }
        // 最优清晰度（没有设置的最高清晰度依次向下类推）, 如果录制容易中断，切换线路
        const realQuality = LivePlatform.getPreference('value', 'orderIndex', HuyaLivePlatform.defaultConfig.qualities, usableQualityValues, preferenceQuality.value)
        if (!realQuality) {
          reject(new Error('无可用清晰度'))
        }
        const realChannel = preferenceChannel
        const streamInfo = data.vStreamInfo.value[0]
        const streamUrl = this.generateStreamUrl(realChannel.value, streamInfo, realQuality.value)
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
  // 旧pc端算法，已弃用
  // generateStreamUrl (cdn, streamName, flvUrl, flvAntiCode, uid, uuid, ratio) {
  //   /**
  //    * pc端UA
  //    * 拼接计算直播流地址(flv,其他格式暂不考虑)
  //    * 清晰度：蓝光8M-0，蓝光4M-4000，超清-2000，流畅-500
  //    * cdn(channel:线路) 默认 http://al.flv.huya.com/src
  //    */
  //   if (!cdn) {
  //     cdn = 'http://al.flv.huya.com/src'
  //   }
  //   let antiCodeArr = flvAntiCode.split('&amp;')
  //   let antiCodeOb = {}
  //   let appendParamArr = []
  //   for (let i = 0; i < antiCodeArr.length; i++) {
  //     // flvAntiCode转为map
  //     let arr = antiCodeArr[i].split('=')
  //     antiCodeOb[arr[0]] = arr[1]
  //     if (i >= 3) {
  //       // 前3个参数参与计算，wsSecret,wsTime, fm, 其余计算完成后拼接在后面
  //       appendParamArr.push(antiCodeArr[i])
  //     }
  //   }
  //   // 计算无关参数转义&amp; &
  //   let appendParam = appendParamArr.join('&')
  //   // fm url解码再base4解码 '_'分割取第一位
  //   let p = Buffer.from(decodeURIComponent(antiCodeOb.fm), 'base64').toString().split('_', 1)[0]
  //   // 当前时间戳17位
  //   let f = String(Date.now() * 10000)
  //   // 固定值
  //   let u = '0'
  //   // 使用'_'按照顺序连接
  //   let h = [p, u, streamName, f, antiCodeOb.wsTime].join('_')
  //   // h MD5
  //   let m = CryptoJS.MD5(h).toString()
  //   // 拼接地址
  //   return `${cdn}/${streamName}.flv?wsSecret=${m}&wsTime=${antiCodeOb.wsTime}&u=${u}&seqid=${f}&${appendParam}&ratio=${ratio}`
  // }
  generateStreamUrl (cdn, streamInfo, ratio) {
    /**
     * pc端UA
     * 拼接直播流地址(flv,其他格式暂不考虑)
     * 清晰度：蓝光8M-0，蓝光4M-4000，超清-2000，流畅-500
     * cdn(channel:线路) 默认 http://al.flv.huya.com/src
     */
    if (!cdn) {
      cdn = 'http://al.flv.huya.com/src'
    }
    // uid = 2287068700, client_uid, 可使用10位随机数代替
    const uid = Math.floor(Date.now() / 1000)
    // 解析antiCode,设置一些默认值（t为平台代码，见下面注释说明）
    let antiCodeArr = (streamInfo.sFlvAntiCode + '&t=103').split('&')
    let antiCodeOb = {}
    let appendParamArr = []
    for (let i = 0; i < antiCodeArr.length; i++) {
      // flvAntiCode转为map
      let arr = antiCodeArr[i].split('=')
      antiCodeOb[arr[0]] = arr[1]
      if (i >= 3) {
        // 前3个参数参与计算，wsSecret,wsTime, fm, 其余计算完成后拼接在后面
        appendParamArr.push(antiCodeArr[i])
      }
    }
    // 计算无关参数转义&amp; &
    let appendParam = appendParamArr.join('&')
    // 填充fm参数
    let fm = Buffer.from(decodeURIComponent(antiCodeOb.fm), 'base64').toString()
    // number类型(uid + Date.now())、ctype、平台代码（adr: 2，huya_liveshareh5: 104，ios: 3，mini_app: 102，wap: 103，web: 100），使用“|”连接并获取MD5摘要，例：1659571203105|tars_mobile|103
    const seqid = Number(uid) + Date.now()
    const s = CryptoJS.MD5(''.concat(seqid).concat('|').concat(antiCodeOb.ctype).concat('|').concat(antiCodeOb.t)).toString()
    fm = fm.replace('$0', uid).replace('$1', streamInfo.sStreamName).replace('$2', s).replace('$3', antiCodeOb.wsTime)
    // 获取wsSecret
    const wsSecret = CryptoJS.MD5(fm)
    // uuid
    const uuid = Number((Date.now() % 1e10 * 1e3 + (1e3 * Math.random() | 0)) % 4294967295)
    // 拼接请求参数
    const params = `wsSecret=${wsSecret}&wsTime=${antiCodeOb.wsTime}&seqid=${seqid}&ver=1&${appendParam}&ratio=${ratio}&uid=${uid}&uuid=${uuid}${cdn.indexOf('va.huya.com') + cdn.indexOf('cdnweb.huya.com') + cdn.indexOf('va-cmcc.huya.com') === -3 ? '' : '&https=1'}`
    return `${cdn}/${streamInfo.sStreamName}.flv?${params}`
  }
}
/**
 * 获取用户房间地址或主页地址
 * @param user 用户信息
 */
HuyaLivePlatform.getUserRoomOrHomeUrl = function (user) {
  return 'https://www.huya.com/' + user.id
}

/**
 * 检查是否支持
 **/
HuyaLivePlatform.isSupportedUrl = function (url) {
  return /https?:\/\/(m|www)\.huya\.com\/.*/.test(url)
}

// 蓝光8M-0，蓝光4M-4000，超清-2000，流畅-500
HuyaLivePlatform.platformInfo = {
  code: 'huya',
  name: '虎牙',
  website: 'https://www.huya.com'
}
HuyaLivePlatform.defaultConfig = {
  qualities: [
    {
      code: 'LC',
      name: '流畅',
      value: '500',
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
      code: 'LG-8M',
      name: '蓝光8M',
      value: '0',
      orderIndex: 4
    }
  ],
  channels: [
    {
      code: 'AL-FLV',
      name: '线路1',
      value: 'http://hw.flv.huya.com/src',
      orderIndex: 1
    }
  ],
  defaultQualityCode: 'LG-8M',
  defaultChannelCode: 'AL-FLV',
  idPlaceholder: '请输入直播间地址或房间号',
  dynamicRoomId: false
}
export default HuyaLivePlatform
