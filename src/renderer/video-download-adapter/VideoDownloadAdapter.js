class VideoDownloadAdapter {
  constructor () {
    this.phoneUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
    this.pcUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36'
  }
  async getDownloadInfo (url, preferenceQualityCode) {
    throw Error('method not implemented')
  }
  async getVideoDetails (url) {
    throw Error('method not implemented')
  }
}
// 输出格式
VideoDownloadAdapter.supportVideoOutPutFormats = {
  'flv': {
    '-flvflags': 'add_keyframe_index'
  },
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

VideoDownloadAdapter.setFFmpegOutputOptions = (ffmpeg_, ffmpegOutputOption) => {
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

/**
 * 寻找最佳匹配
 * @param findKey 查找key
 * @param orderKey 排序key
 * @param findArray 所有匹配
 * @param filterArray 可用匹配
 * @param value 查找值
 * @return {null|*}
 */
VideoDownloadAdapter.getPreference = (findKey, orderKey, findArray, filterArray, value) => {
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
export default VideoDownloadAdapter
