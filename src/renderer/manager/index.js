import recordManager from './record-manager'
import downloadManager from './download-manager'

const manager = {
  install: function (Vue) {
    console.log('安装了')
    Vue.prototype.$manager = {
      recordManager,
      downloadManager
    }
  },
  init: function () {
    recordManager.init()
    downloadManager.init()
  }
}

export default manager
