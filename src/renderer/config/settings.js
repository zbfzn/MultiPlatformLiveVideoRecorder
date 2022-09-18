import dbs from '../db'
const Settings = {}

/**
 * 是否开启自动检查
 */
export function enableAutoCheck () {
  return new Promise((resolve, reject) => {
    dbs.settings.$find({}).sort({updateTime: -1}).then((e, docs) => {
      if (e) {
        reject(e)
      } else {
        resolve(docs.length > 0 ? docs[0].enableAutoCheck : null)
      }
    })
  })
}

export function getAppOutPutPath () {
  return new Promise((resolve, reject) => {
    dbs.settings.$find({}).sort({updateTime: -1}).then((e, docs) => {
      if (e) {
        reject(e)
      } else {
        resolve(docs.length > 0 ? docs[0].defaultOuPutDir : null)
      }
    })
  })
}

export function getSettings () {
  return new Promise((resolve, reject) => {
    dbs.settings.$find({}).sort({updateTime: -1}).then((e, docs) => {
      if (e) {
        reject(e)
      } else {
        resolve(docs.length > 0 ? docs[0] : null)
      }
    })
  })
}

/**
 * 保存设置，不删除旧设置
 * @param settings
 * @return {Promise<unknown>}
 */
export function saveSettings (settings) {
  settings.updateTime = new Date()
  return dbs.settings._insert_(settings)
}

export default Settings
