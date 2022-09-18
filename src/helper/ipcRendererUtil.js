import {ipcRenderer} from 'electron'
import IpcChannel from './IpcChannel'

// Renderer进程通信工具
const ipcRendererUtil = {
  onStopAllTasks: (listener) => {
    // 必须先移除所有监听器，避免重复监听
    ipcRenderer.removeAllListeners(IpcChannel.stopAllTasks)
    ipcRenderer.on(IpcChannel.stopAllTasks, listener)
  },
  sendToMain: (channel, ...args) => {
    ipcRenderer.send(channel, ...args)
  },
  on: (channel, listener) => {
    ipcRenderer.on(channel, listener)
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  },
  removeListener: (channel, listener) => {
    ipcRenderer.removeListener(channel, listener)
  }
}

export default ipcRendererUtil
