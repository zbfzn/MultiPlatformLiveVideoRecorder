import fs from 'fs'
import path from 'path'
import CryptoJS from 'crypto-js'

// 十六位十六进制数作为密钥
const aesKey = CryptoJS.enc.Utf8.parse('C23FF23A12ABCDBF')
// 十六位十六进制数作为密钥偏移量
const aesIv = CryptoJS.enc.Utf8.parse('ABCDEF1234123412')
// 解密方法
function aesDecrypt (word) {
  let encryptedHexStr = CryptoJS.enc.Hex.parse(word)
  let srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr)
  let decrypt = CryptoJS.AES.decrypt(srcs, aesKey, { iv: aesIv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 })
  let decryptedStr = decrypt.toString(CryptoJS.enc.Utf8)
  return decryptedStr.toString()
}

// 加密方法
function aesEncrypt (word) {
  let srcs = CryptoJS.enc.Utf8.parse(word)
  let encrypted = CryptoJS.AES.encrypt(srcs, aesKey, { iv: aesIv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 })
  return encrypted.ciphertext.toString().toUpperCase()
}
// electron store,简单的存储类
class ElectronStore {
  constructor (app) {
    if (!app) {
      const electron = require('electron')
      if (electron.app) {
        // store 在main中调用
        app = electron.app
      } else {
        // store 在render中调用
        app = electron.remote.app
      }
    }
    const storeDir = app.getPath('userData')
    this._storeName = 'store.json'
    this._storeData = {}
    const fullPath = path.join(storeDir, this._storeName)
    this._storePath = fullPath
    this.mkdirs(storeDir)
    if (!fs.existsSync(fullPath)) {
      this.saveStore()
    } else {
      const content = fs.readFileSync(this._storePath, {encoding: 'utf-8'})
      if (!content || content.trim() === '') {
        this.saveStore()
      } else {
        this.getStore()
      }
    }
  }
  saveStore () {
    fs.writeFileSync(this._storePath, aesEncrypt(JSON.stringify(this._storeData)), {encoding: 'utf-8'})
  }
  getStore () {
    const text = fs.readFileSync(this._storePath, {encoding: 'utf-8'})
    this._storeData = JSON.parse(aesDecrypt(text))
    return this._storeData
  }
  mkdirs (dirs) {
    if (fs.existsSync(dirs)) {
      return true
    } else {
      if (this.mkdirs(path.dirname(dirs))) {
        fs.mkdirSync(dirs)
      }
    }
  }
  get (key, def) {
    const value = this._storeData[key]
    if (!value && def) {
      return def
    }
    return value
  }
  set (key, value) {
    this._storeData[key] = value
    this.saveStore()
  }
  clear () {
    this._storeData = {}
    this.saveStore()
  }
  // 静态调用
  static store
  static initStore () {
    if (!this.store) {
      this.store = new ElectronStore()
    }
  }
  static get (key, def) {
    this.initStore()
    return this.store.get(key, def)
  }
  static set (key, value) {
    this.initStore()
    this.store.set(key, value)
  }
  static clear () {
    this.initStore()
    this.store.clear()
  }
}
export default ElectronStore
