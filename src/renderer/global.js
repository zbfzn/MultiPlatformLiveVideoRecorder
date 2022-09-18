import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import fs from 'fs'
import path from 'path'

const Global = {
  init: () => {
    // eslint-disable-next-line no-extend-native
    Date.prototype.Format = function (fmt) {
      let o = {
        'M+': this.getMonth() + 1,
        'd+': this.getDate(),
        'H+': this.getHours(),
        'm+': this.getMinutes(),
        's+': this.getSeconds(),
        'S+': this.getMilliseconds()
      }
      if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length))
      }
      for (let k in o) {
        if (new RegExp('(' + k + ')').test(fmt)) {
          fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(String(o[k]).length)))
        }
      }
      return fmt
    }

    console.log(ffmpegStatic)
    // ffmpeg-static node_moudles 删除其他平台二进制文件或修改package.json
    ffmpeg.setFfmpegPath(ffmpegStatic.path.replace('app.asar', 'app.asar.unpacked'))

    // 递归创建目录 同步方法
    fs.mkdirsSync = function (dirname) {
      if (fs.existsSync(dirname)) {
        return true
      } else {
        if (this.mkdirsSync(path.dirname(dirname))) {
          fs.mkdirSync(dirname)
          return true
        }
      }
    }
    // linkedom 解决找不到globalThis问题, 修改node_modules/linkedom/node_modules/htmlparser2/lib/esm/index.js，parseFeed替换成下面导出方式
    /*
    // 替换函数
    const parseFeed = function (feed, options = { xmlMode: true }) {
      return getFeed(parseDOM(feed, options));
    }
    export parseFeed;
    */
    // eslint-disable-next-line no-undef
    global.globalThis = {}
  }
}
export default Global
