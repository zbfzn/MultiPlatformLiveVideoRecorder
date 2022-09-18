import HuyaLivePlatform from './HuyaLivePlatform'
import DouyuLivePlatform from './DouyuLivePlatform'
import DouyinLivePlatform from './DouyinLivePlatform'
import BilibiliLivePlatform from './BilibiliLivePlatform'

export default {
  platforms: [
    DouyuLivePlatform,
    HuyaLivePlatform,
    DouyinLivePlatform,
    BilibiliLivePlatform
  ],
  getPlatform: function (platformCode) {
    for (const platform of this.platforms) {
      if (platform.platformInfo.code === platformCode) {
        return platform
      }
    }
    return null
  }
}
