import VideoDownloadAdapter from './VideoDownloadAdapter'
import httpUtil from '../utils/http-util'
import {getSettings} from '../config/settings'
class BiliBiliVideoDownloadAdapter extends VideoDownloadAdapter {
  constructor () {
    super()
    this.httpHeaders = {
      'User-Agent': this.pcUserAgent,
      'referer': 'https://www.bilibili.com'
    }
  }
  async getDownloadInfo (url, preferenceQuality) {
    const preferenceQualityCode = preferenceQuality.code
    return new Promise(async (resolve, reject) => {
      try {
        const settings = await getSettings()
        // const bvid = new RegExp('https?://(?:www|m)\\.bilibili.com/([^/?]+)').exec(url)[1]
        // 获取页面默认视频信息,支持的清晰度信息
        const videoPageHtml = (await httpUtil.get(url, this.httpHeaders)).data
        // const defaultVideoDataRegexp = /window.__playinfo__=([^<]+)</
        // const defaultVideoDataArr = defaultVideoDataRegexp.exec(videoPageHtml)
        // if (!defaultVideoDataArr) {
        //   reject(new Error('获取视频信息错误，Default video data not found'))
        //   return
        // }
        // const defaultVideoData = JSON.parse(defaultVideoDataArr[1])
        // const acceptQuality = defaultVideoData.data.accept_quality
        // cid,标题等信息
        const videoInfoRegexp = /window.__INITIAL_STATE__=([^<]+);\(function/
        const videoInfoArr = videoInfoRegexp.exec(videoPageHtml)
        if (!videoInfoArr) {
          reject(new Error('获取视频信息错误2，Default video extend data not found'))
          return
        }
        const videoInfo = JSON.parse(videoInfoArr[1])
        const cid = videoInfo.videoData.cid
        const title = videoInfo.videoData.title
        const bvid = videoInfo.videoData.bvid
        const owner = videoInfo.videoData.owner.name
        // 选择能下载的清晰度,bilibili会自动选择能下载最高清晰度，如选择116，实际只有64，则返回64清晰度的下载链接
        const preferenceQuality = this.getQuality(preferenceQualityCode)
        const qn = preferenceQuality ? preferenceQuality.value : 116
        // 获取音视频不分离的flv下载地址
        const videoDetailApi = `https://api.bilibili.com/x/player/playurl?cid=${cid}&bvid=${bvid}&qn=${qn}&type=flv&otype=json&fnval=4048`
        const data = (await httpUtil.postExchange({
          config: {
            method: 'get',
            url: videoDetailApi,
            headers: {
              referfer: url,
              'User-Agent': this.pcUserAgent,
              cookie: settings.biliBiliUserCookie ? settings.biliBiliUserCookie : ''
            }
          }
        })).data
        if (data.data.durl) {
          // flv
          const flvUrl = data.data.durl[0].url
          const quality = this.getQualityByValue(Number(data.data.quality))
          resolve({
            streamUrls: flvUrl,
            title: title,
            owner: owner,
            quality: quality,
            ffmpegCommandOutputOption: {
              '-headers': `Referer: ${url}`,
              '-user_agent': this.pcUserAgent,
              '-i': flvUrl,
              '-c': 'copy'
            }
          })
        } else {
          // dash ,混流（音频+视频）
          const dashVideoUrl = data.data.dash.video[0].baseUrl
          const dashAudioUrl = data.data.dash.audio[0].baseUrl
          const quality = this.getQualityByValue(Number(data.data.quality))
          resolve({
            streamUrls: dashVideoUrl,
            title: title,
            owner: owner,
            quality: quality,
            ffmpegCommandOutputOption: [
              {
                '-headers': `Referer: ${url}`,
                '-user_agent': this.pcUserAgent,
                '-i': dashVideoUrl
              },
              {
                '-headers': `Referer: ${url}`,
                '-user_agent': this.pcUserAgent,
                '-i': dashAudioUrl,
                '-c': 'copy'
              }
            ]
          })
        }
      } catch (e) {
        reject(e)
      }
    })
  }

  async getVideoDetails (url) {
    // 获取页面数据,返回所有数据，页面进行分页
    return new Promise(async (resolve, reject) => {
      try {
        let uid = null
        if (/https?:\/\/space.bilibili.com\/(\d+)[/?$]/.test(url)) {
          uid = /https?:\/\/space.bilibili.com\/(\d+)[/?$]/.exec(url)[1]
        } else if (/https?:\/\/www.bilibili.com\/medialist\/play\/(\d+)[/?]/.test(url)) {
          uid = /https?:\/\/www.bilibili.com\/medialist\/play\/(\d+)[/?]/.exec(url)[1]
        } else {
          const html = (await httpUtil.get(url, this.httpHeaders)).data
          const videoInfoRegexp = /window.__INITIAL_STATE__=([^<]+);\(function/
          const videoInfoArr = videoInfoRegexp.exec(html)
          if (!videoInfoArr) {
            reject(new Error('获取视频信息错误2，Default video extend data not found'))
            return
          }
          const videoInfo = JSON.parse(videoInfoArr[1])
          resolve([
            {
              id: videoInfo.bvid,
              title: videoInfo.videoData.title,
              cover: videoInfo.videoData.pic,
              url: url
            }
          ])
          return
        }
        // 列表解析
        const videoDetailList = []
        let hasMore = true
        let oid = 0
        // 单次请求最多100条，后续支持获取合集、分类所有视频
        const listApi = `https://api.bilibili.com/x/v2/medialist/resource/list?type=1&otype=2&biz_id=${uid}&bvid=&with_current=true&mobi_app=web&ps=100&direction=false&sort_field=1&tid=0&desc=true&oid=`
        while (hasMore) {
          const data = (await httpUtil.postExchange({
            config: {
              method: 'get',
              url: listApi + oid,
              headers: {
                referfer: 'https://www.bilibili.com',
                'User-Agent': this.pcUserAgent
              }
            }
          })).data
          hasMore = data.data.has_more
          for (let video of data.data.media_list) {
            if (video.id === oid) {
              // 避免重复，哔哩哔哩查询的列表第一个是上次查询最后一个，故去除
              continue
            }
            videoDetailList.push({
              id: video.bv_id,
              title: video.title,
              cover: video.cover,
              url: `https://www.bilibili.com/video/${video.bv_id}`
            })
          }
          oid = data.data.media_list[data.data.media_list.length - 1].id
        }
        resolve(videoDetailList)
      } catch (e) {
        reject(e)
      }
    })
  }

  getQuality (code) {
    for (let quality of BiliBiliVideoDownloadAdapter.defaultConfig.qualities) {
      if (code === quality.code) {
        return quality
      }
    }
    return null
  }
  getQualityByValue (value) {
    for (let quality of BiliBiliVideoDownloadAdapter.defaultConfig.qualities) {
      if (value === quality.value) {
        return quality
      }
    }
    return null
  }
}
BiliBiliVideoDownloadAdapter.info = {
  code: 'bilibili',
  name: '哔哩哔哩',
  webUrl: 'https://www.bilibili.com'
}

BiliBiliVideoDownloadAdapter.defaultConfig = {
  qualities: [
    {
      code: 'LC360P',
      name: '流畅 360P',
      value: 16,
      orderIndex: 1
    },
    {
      code: 'QX480P',
      name: '清晰 480P',
      value: 32,
      orderIndex: 2
    },
    {
      code: 'GQ720P',
      name: '高清 720P',
      value: 64,
      orderIndex: 3
    },
    {
      code: 'GQ1080P',
      name: '高清 1080P',
      value: 80,
      orderIndex: 4
    },
    {
      code: 'GQ1080PGM',
      name: '高清 1080P高码率',
      value: 112,
      orderIndex: 5
    },
    {
      code: 'GQ1080P60',
      name: '高清 1080P60帧',
      value: 116,
      orderIndex: 6
    },
    {
      code: '4KCQ',
      name: '超清 4K',
      value: 120,
      orderIndex: 7
    }
  ]
}
export default BiliBiliVideoDownloadAdapter
