import Datastore from 'nedb'
import path from 'path'
import { remote } from 'electron'

// 分页查询
/**
 * @param query {Object}
 * @return {any}
 */
Datastore.prototype.$find = function (query) {
  let cursor = this.find(query)
  let _cursor = {
    /**
     * @param num {Number} 最大条数
     * @return {any}
     */
    limit: num => {
      cursor.limit(num)
      return _cursor
    },
    /**
     * @param num {Number}舍弃条数
     * @return {any}
     */
    skip: num => {
      cursor.skip(num)
      return _cursor
    },
    /**
     * 排序
     * @param sortQuery
     */
    sort: sortQuery => {
      cursor.sort(sortQuery)
      return _cursor
    },
    then: callback => {
      cursor.exec(callback)
    }
  }
  return _cursor
}

Datastore.prototype.$find_ = function (query) {
  let cursor = this.find(query)
  let _cursor = {
    /**
     * @param num {Number} 最大条数
     * @return {any}
     */
    limit: num => {
      cursor.limit(num)
      return _cursor
    },
    /**
     * @param num {Number}舍弃条数
     * @return {any}
     */
    skip: num => {
      cursor.skip(num)
      return _cursor
    },
    /**
     * 排序
     * @param sortQuery
     */
    sort: sortQuery => {
      cursor.sort(sortQuery)
      return _cursor
    },
    execute () {
      return new Promise((resolve, reject) => {
        cursor.exec((e, docs) => {
          if (!e) {
            resolve(docs)
          } else {
            reject(e)
          }
        })
      })
    }
  }
  return _cursor
}

Datastore.prototype._find_ = function (query) {
  return new Promise((resolve, reject) => {
    this.find(query, (e, docs) => {
      if (e) {
        reject(e)
      } else {
        resolve(docs)
      }
    })
  })
}
Datastore.prototype._update_ = function (query, updated, rejection) {
  return new Promise((resolve, reject) => {
    this.update(query, updated, rejection, (e, num) => {
      if (e) {
        reject(e)
      } else {
        resolve(num)
      }
    })
  })
}
Datastore.prototype._count_ = function (query) {
  return new Promise((resolve, reject) => {
    this.count(query, (e, count) => {
      if (e) {
        reject(e)
      } else {
        resolve(count)
      }
    })
  })
}
Datastore.prototype._insert_ = function (doc) {
  return new Promise((resolve, reject) => {
    this.insert(doc, (e, ndoc) => {
      if (e) {
        reject(e)
      } else {
        resolve(ndoc)
      }
    })
  })
}
Datastore.prototype._remove_ = function (query, rejection) {
  return new Promise((resolve, reject) => {
    if (!rejection) {
      rejection = {}
    }
    this.remove(query, rejection, (e, num) => {
      if (e) {
        reject(e)
      } else {
        resolve(num)
      }
    })
  })
}
// 录制信息
const record = new Datastore({
  autoload: true,
  filename: path.join(remote.app.getPath('userData'), '/db/Record.db')
})
// 录制历史
const recordHistory = new Datastore({
  autoload: true,
  filename: path.join(remote.app.getPath('userData'), '/db/RecordHistory.db')
})
// 设置
const settings = new Datastore({
  autoload: true,
  filename: path.join(remote.app.getPath('userData'), '/db/Settings.db')
})

// 下载记录
const downloadRecord = new Datastore({
  autoload: true,
  filename: path.join(remote.app.getPath('userData'), '/db/DownloadRecord.db')
})
console.log(record)
console.log(recordHistory)
console.log(settings)
console.log(downloadRecord)

export default {
  record,
  recordHistory,
  settings,
  downloadRecord
}
