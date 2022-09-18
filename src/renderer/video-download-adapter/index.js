import BiliBiliVideoDownloadAdapter from './BiliBiliVideoDownloadAdapter'
import HuyaVideoDownloadAdapter from './HuyaVideoDownloadAdapter'

export default {
  adapters: [
    BiliBiliVideoDownloadAdapter,
    HuyaVideoDownloadAdapter
  ],
  getAdapter (code) {
    for (let adapter of this.adapters) {
      if (adapter.info.code === code) {
        return adapter
      }
    }
  }
}
