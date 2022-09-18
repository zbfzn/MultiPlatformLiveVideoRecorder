class LivePlatform {
  constructor () {
    this.phoneUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
    this.pcUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36'
  }

  trim (str) {
    return str.replace(/\s/g, '')
  }
  isUrl (idOrUrl) {
    idOrUrl = this.trim(idOrUrl)
    return !!new RegExp('https?://[\\S]+', 'g').exec(idOrUrl)
  }
  /**
   * @return {Promise}
   */
  getUserInfo (idOrUrl) {
    throw Error('not implement getUserInfo')
  }

  /**
   * @param user getUserInfo返回的对象
   * @return {Promise}
   */
  check (user, preferenceQuality, preferenceChannel) {
    throw Error('not implement check')
  }
}

/**
 * 支持的视频输出格式
 * @type {{mp4: {'-f': string}, flv: {}, mov: {'-f': string}, avi: {'-bsf:v': string}, mkv: {}}}
 */
LivePlatform.supportVideoOutPutFormats = {
  'flv': {},
  'mp4': {
    '-f': 'mp4'
  },
  'mov': {
    '-f': 'mov'
  },
  'mkv': {},
  'avi': {
    '-bsf:v': 'h264_mp4toannexb'
  }
}
/**
 * 获取用户房间地址或主页地址
 * @param user 用户信息
 */
LivePlatform.getUserRoomOrHomeUrl = function (user) {
  throw Error('not implement getUserRoomOrHomeUrl')
}

/**
 * 获取指定code的线路信息
 * @param platform
 * @param channelCode
 * @return {null|*}
 */
LivePlatform.getChannelByCode = (platform, channelCode) => {
  if (!channelCode) {
    channelCode = platform.defaultConfig.defaultChannelCode
  }
  let channels = platform.defaultConfig.channels
  for (let channel of channels) {
    if (channelCode === channel.code) {
      return channel
    }
  }
  return null
}

/**
 * 获取指定code的清晰度信息
 * @param platform
 * @param qualityCode
 * @return {null|*}
 */
LivePlatform.getQualityByCode = (platform, qualityCode) => {
  if (!qualityCode) {
    qualityCode = platform.defaultConfig.defaultQualityCode
  }
  let qualities = platform.defaultConfig.qualities
  for (let quality of qualities) {
    if (qualityCode === quality.code) {
      return quality
    }
  }
  return null
}

LivePlatform.getPreference = (findKey, orderKey, findArray, filterArray, value) => {
  findArray = findArray.sort((a, b) => {
    // 根据orderKey的值降序, orderIndex越大越优
    return a[orderKey] > b[orderKey] ? -1 : 1
  })
  let filterOb = {}
  for (let findValue of filterArray) {
    filterOb[findValue] = true
  }
  let max = null
  for (let findOb of findArray) {
    if (filterOb[findOb[findKey]]) {
      if (!max) {
        max = findOb
      }
      if (findOb[findKey] === value) {
        return findOb
      }
    }
  }
  return max
}

LivePlatform.setFFmpegOutputOptions = (ffmpeg_, ffmpegOutputOption) => {
  if (ffmpegOutputOption instanceof Array) {
    // 支持追加相同key内容
    for (let index in ffmpegOutputOption) {
      for (const key of Object.keys(ffmpegOutputOption[index])) {
        ffmpeg_.outputOptions(key, ffmpegOutputOption[index][key])
      }
    }
  } else {
    for (const key of Object.keys(ffmpegOutputOption)) {
      ffmpeg_.outputOptions(key, ffmpegOutputOption[key])
    }
  }
}

export default LivePlatform
