import {BrowserWindow, ipcMain} from 'electron'
import IpcChannel from './IpcChannel'
// 主进程进程通信工具
const IpcMainUtil = {
  stopAllTasks: () => {
    BrowserWindow.getAllWindows()
      .forEach(window_ => {
        window_.webContents.send(IpcChannel.stopAllTasks, 'stopAllTasks')
      })
  },
  sendToRenderer: (window, channel, ...args) => {
    window.webContents.send(channel, ...args)
  },
  on: (channel, listener) => {
    ipcMain.on(channel, listener)
  },
  removeAllListeners: (channel) => {
    ipcMain.removeAllListeners(channel)
  },
  removeListener: (channel, listener) => {
    ipcMain.removeListener(channel, listener)
  }
}
export default IpcMainUtil
