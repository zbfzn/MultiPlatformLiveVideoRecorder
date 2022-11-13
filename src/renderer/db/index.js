import Datastore from 'nedb'
import path from 'path'
import { remote } from 'electron'
import fs from 'fs'
import readline from 'readline'

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
  autoload: false,
  filename: path.join(remote.app.getPath('userData'), '/db/Record.db')
})
// 录制历史
const recordHistory = new Datastore({
  autoload: false,
  filename: path.join(remote.app.getPath('userData'), '/db/RecordHistory.db')
})
// 设置
const settings = new Datastore({
  autoload: false,
  filename: path.join(remote.app.getPath('userData'), '/db/Settings.db')
})

// 下载记录
const downloadRecord = new Datastore({
  autoload: false,
  filename: path.join(remote.app.getPath('userData'), '/db/DownloadRecord.db')
})
console.log(record)
console.log(recordHistory)
console.log(settings)
console.log(downloadRecord)

export async function checkAndRebuild (dbs, onError, onStart, onFinished, onFinally) {
  const errorCallback = onError && typeof onError === 'function' ? onError : _ => {}
  var startFunReturn
  const rebuildList = []
  try {
    for (let db of Object.values(dbs)) {
      // 判断单个db文件是否超256MB
      if (fs.statSync(db.filename).size / (1024 * 1024) > 256) {
        // 放入重建列表
        rebuildList.push(db)
      } else {
        // 数据库文件正常则加载数据库
        db.loadDatabase()
      }
    }
    if (rebuildList.length > 0) {
      if (onStart && typeof onStart === 'function') {
        startFunReturn = onStart()
      }
      const promises = []
      // 重建
      for (const db of rebuildList) {
        promises.push(new Promise((resolve, reject) => {
          const rebFileName = db.filename + '.reb'
          const blockedDbFileName = db.filename + '.blocked'
          const recordMap = {}
          const rl = readline.createInterface({
            input: fs.createReadStream(db.filename, {
              encoding: 'utf-8'
            }),
            output: process.stdout,
            terminal: false
          })
          rl.on('line', line => {
            if (!line || line.trim().length === 0) {
              return
            }
            const rec = JSON.parse(line)
            if (rec['$$deleted']) {
              // 已删除
              delete recordMap[rec._id]
              return
            }
            // 保留最后一条记录
            recordMap[rec._id] = rec
          })
          rl.on('close', _ => {
            try {
              fs.writeFileSync(rebFileName, Object.values(recordMap).map(item => JSON.stringify(item)).join('\n'))
              // 当前文件备份
              fs.renameSync(db.filename, blockedDbFileName)
              // 重建的数据库文件替换
              fs.renameSync(rebFileName, db.filename)
              // 重载
              db.loadDatabase()
              // 加载数据库成功，删除异常文件
              fs.unlinkSync(blockedDbFileName)
            } catch (e) {
              reject(e)
            }
            resolve()
          })
        }))
      }
      await Promise.all(promises).then(_ => {
        if (onFinished && typeof onFinished === 'function') {
          onFinished(startFunReturn)
        }
      }).catch(e => {
        throw e
      })
    }
  } catch (e) {
    errorCallback(e)
    if (onFinished && typeof onFinished === 'function') {
      onFinished(startFunReturn)
    }
  } finally {
    if (onFinally && typeof onFinally === 'function') {
      onFinally(startFunReturn)
    }
  }
}

export default {
  record,
  recordHistory,
  settings,
  downloadRecord
}
