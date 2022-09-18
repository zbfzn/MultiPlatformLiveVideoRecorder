import VideoDownloadAdapter from './VideoDownloadAdapter'
import httpUtil from '../utils/http-util'
import {parseHTML} from 'linkedom'

class HuyaVideoDownloadAdapter extends VideoDownloadAdapter {
  constructor () {
    super()
    this.httpHeaders = {
      'User-Agent': this.pcUserAgent,
      'referer': 'https://v.huya.com'
    }
  }
  async getDownloadInfo (url, preferenceQuality) {
    return new Promise(async (resolve, reject) => {
      try {
        const html = (await httpUtil.get(url, this.httpHeaders)).data
        const initData = JSON.parse(new RegExp('window.HNF_GLOBAL_INIT\\s?=\\s?([^<]+)</script>').exec(html)[1])
        const videoData = initData.videoData
        const videoInfoApi = `https://v-api-player-ssl.huya.com/?r=vhuyaplay%2Fvideo&vid=${videoData.vid}&format=mp4%2Cm3u8&_=${new Date().getTime()}`
        const videoInfo = (await httpUtil.get(videoInfoApi, this.httpHeaders)).data
        // 选择最佳清晰度
        preferenceQuality = this.getQuality(preferenceQuality.code)
        const quality = VideoDownloadAdapter.getPreference('value', 'orderIndex', HuyaVideoDownloadAdapter.defaultConfig.qualities, videoInfo.result.items.map(item => item.definition), preferenceQuality.value)
        if (!quality) {
          reject(new Error('无可用清晰度'))
          return
        }
        for (let item of videoInfo.result.items) {
          if (quality.value === item.definition) {
            const flvUrl = item.transcode.urls[0]
            resolve({
              streamUrls: flvUrl,
              title: videoData.videoTitle,
              owner: videoData.userInfo.userNick,
              quality: quality,
              ffmpegCommandOutputOption: {
                '-headers': `Referer: ${url}`,
                '-user_agent': this.pcUserAgent,
                '-i': flvUrl,
                '-c': 'copy'
              }
            })
            break
          }
        }
        reject(new Error('未匹配到对应清晰度！'))
      } catch (e) {
        reject(e)
      }
    })
  }

  async getVideoDetails (url) {
    // 获取页面数据,返回所有数据，页面进行分页
    return new Promise(async (resolve, reject) => {
      // 列表解析
      const videoDetailList = []
      try {
        if (new RegExp('https?://v\\.huya\\.com/play/(\\d+)\\.html').test(url)) {
          // 单个视频
          const html = (await httpUtil.get(url, this.httpHeaders)).data
          const initData = JSON.parse(new RegExp('window.HNF_GLOBAL_INIT\\s?=\\s?([^<]+)</script>').exec(html)[1])
          const videoData = initData.videoData
          resolve([
            {
              id: videoData.vid,
              title: videoData.videoTitle,
              cover: this.wrapImageUrl(videoData.covers.cover),
              url: url
            }
          ])
        } else if (new RegExp('https?://v\\.huya\\.com/u/(\\d+)(?:/(video|livevideo)\\.html)?').test(url)) {
          const uid = new RegExp('https?://v\\.huya\\.com/u/(\\d+)(?:/(video|livevideo)\\.html)?').exec(url)[1]
          let videoType = 'video'
          if (url.indexOf('video.html') > -1) {
            videoType = new RegExp('https?://v\\.huya\\.com/u/(\\d+)/(video|livevideo)\\.html').exec(url)[2]
          }
          let cPage = 0
          let totalPages = -1
          do {
            cPage += 1
            const pageUrl = `https://v.huya.com/u/${uid}/${videoType}.html?sort=news&p=${cPage}`
            const html = (await httpUtil.get(pageUrl, this.httpHeaders)).data
            const document = parseHTML(html).window.document
            // 获取当前页列表
            for (let li of document.querySelectorAll(`.${videoType === 'video' ? 'content-list' : 'section-list'} li`)) {
              const a = li.querySelectorAll('a')[0]
              // 视频信息
              videoDetailList.push({
                id: this.getVideoId(a.href),
                title: a.title,
                cover: this.wrapImageUrl(a.querySelectorAll('img')[0].src),
                url: `https://v.huya.com${a.href}`
              })
            }
            // 获取总页数
            const pageAs = document.querySelectorAll('.user-paginator a.paginator-page')
            totalPages = Number(pageAs[pageAs.length - 1].innerText)
          } while (cPage < totalPages)
          resolve(videoDetailList)
        } else {
          reject(new Error('暂不支持该链接！'))
        }
      } catch (e) {
        reject(e)
      }
    })
  }

  getQuality (code) {
    for (let quality of HuyaVideoDownloadAdapter.defaultConfig.qualities) {
      if (code === quality.code) {
        return quality
      }
    }
    return null
  }
  getQualityByValue (value) {
    for (let quality of HuyaVideoDownloadAdapter.defaultConfig.qualities) {
      if (value === quality.value) {
        return quality
      }
    }
    return null
  }
  getVideoId (urlPath) {
    return /\/play\/(\d+)\.html/.exec(urlPath)[1]
  }
  wrapImageUrl (url) {
    return url.indexOf('http') === 0 ? url : ('https:' + url)
  }
}
HuyaVideoDownloadAdapter.info = {
  code: 'huya',
  name: '虎牙',
  webUrl: 'https://v.huya.com'
}

HuyaVideoDownloadAdapter.defaultConfig = {
  qualities: [
    {
      code: 'LC',
      name: '流畅',
      value: '350',
      orderIndex: 1
    },
    {
      code: 'GQ',
      name: '高清',
      value: '1000',
      orderIndex: 2
    },
    {
      code: 'CQ',
      name: '超清',
      value: '1300',
      orderIndex: 3
    },
    {
      code: 'YH',
      name: '原画',
      value: 'yuanhua',
      orderIndex: 4
    }
  ]
}
export default HuyaVideoDownloadAdapter
