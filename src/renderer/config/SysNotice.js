import path from 'path'

const SysNotice = {}

/**
 * 创建系统通知
 * @param title 标题
 * @param body 内容
 * @return {Notification}
 */
export function createNotice (title, body) {
  return new Notification(title, {
    icon:
      process.platform === 'win32'
        ? path.join(__static, 'icon.ico')
        : null,
    body
  })
}

SysNotice.createNotice = createNotice
export default SysNotice
