const { version, build } = require('../../package.json')

export const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

/**
 * @param time 单位ms
 * @return {Promise<unknown>}
 */
export function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

/**
 * 根据不同平台移除路径非法字符
 * @param str
 * @return {string|*}
 */
export function illegalPathCharRemove (str) {
  if (typeof str !== 'string') return str
  switch (process.platform) {
    case 'win32':
      str = str.replace(/[<>:"|?*./\\]/g, '')
      break
    case 'linux':
      str = str.replace(/\./g, '')
      break
    case 'darwin':
      str = str.replace(/:/g, '')
      break
  }
  return str
}

export function getAppName () {
  return `${build.productName} - v${version}`
}

export function getProductVersion () {
  return version
}

export function getProductName () {
  return build.productName
}

export function getGatewayExchangeServerPort () {
  return process.env.NODE_ENV === 'development' ? 31091 : 32999
}
