'use strict'

import {app, BrowserWindow, Menu, Tray} from 'electron'
import path from 'path'
import fs from 'fs'
import express from 'express'
import bodyParser from 'body-parser'
import axios from 'axios'

import IpcMainUtil from '../helper/ipcMainUtil'
import IpcChannel from '../helper/IpcChannel'
import {getAppName, getGatewayExchangeServerPort} from '../helper'
/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}
// 全局错误捕捉
const errorHandler = (err) => {
  console.error('uncaught', err)
  fs.writeFileSync(`uncaught-${Date.now()}.log`, err.stack)
}
process.on('uncaughtException', errorHandler)
process.on('unhandledRejection', errorHandler)

let mainWindow
let tray = null
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`
// 单例模式
const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})
// 第二个实例停止
if (isSecondInstance) {
  app.quit()
}

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 830,
    useContentSize: true,
    width: 1680,
    show: false,
    icon: path.join(__dirname, 'static/icon32.ico'),
    // 关闭web安全（允许跨域）
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  mainWindow.appTray = tray
  // mainWindow.setMenu(null)
  // 打开开发者工具（调试使用）
  // mainWindow.webContents.openDevTools()
  mainWindow.loadURL(winURL)

  mainWindow.on('ready-to-show', () => {
    mainWindow.setTitle(getAppName())
    // mainWindow.webContents.openDevTools()
    mainWindow.show()
  })
  mainWindow.on('close', event => {
    event.preventDefault()
    // 有正在进行中的任务，询问是否停止后关闭，关闭过程交由Renderer
    IpcMainUtil.stopAllTasks()
  })
  mainWindow.on('closed', () => {
    tray = null
    mainWindow = null
  })
  // 抖音过验证码弹窗
  let browserWindow
  // 接收renderer事件，抖音获取房间信息
  IpcMainUtil.on(IpcChannel.getDouyinRoomData, async (event, url) => {
    try {
      if (browserWindow && !browserWindow.destroyed()) {
        // 已有窗口打开, 销毁
        IpcMainUtil.sendToRenderer(mainWindow, IpcChannel.getDouyinRoomDataReply, url, false)
        browserWindow.destroy()
        browserWindow = null
      }
      let failed = true
      let hasSetShowWindowDelay = false
      browserWindow = new BrowserWindow({
        parent: mainWindow,
        height: 500,
        width: 800,
        show: false
      })
      browserWindow.loadURL(url)
      browserWindow.webContents.on('dom-ready', () => {
        // 页面刷新会触发
        browserWindow.webContents
          .executeJavaScript(
            `
         new Promise((resolve, reject) => {
           let data = false
            try {
              data = document.getElementById('RENDER_DATA').innerText;
              data = decodeURIComponent(data);
              console.log(data)
            } catch(e) {
            console.log('No roomInfo found')
            }
        resolve(data);
       });
      `, true).then((result) => {
            // console.log(result)
            if (!result) {
              if (!hasSetShowWindowDelay) {
                setTimeout(() => {
                  // 未直接获取到房间信息，显示窗口
                  if (failed && browserWindow && !browserWindow.destroyed()) {
                    browserWindow.show()
                  }
                }, 4000)
                hasSetShowWindowDelay = true
              }
            } else {
              IpcMainUtil.sendToRenderer(mainWindow, IpcChannel.getDouyinRoomDataReply, url, true, result)
              if (browserWindow) {
                browserWindow.destroy()
                browserWindow = null
              }
              failed = false
            }
          })
      })
      browserWindow.on('close', (closeEvent) => {
        closeEvent.preventDefault()
        browserWindow.webContents.executeJavaScript(`
       new Promise((resolve, reject) => {
       let data = false
        try {
          data = document.getElementById('RENDER_DATA').innerText;
          data = decodeURIComponent(data);
          console.log(data)
        } catch(e) {
        console.log('No roomInfo found')
        }
        resolve(data);
       });
    `, true).then((result) => {
          if (result) {
            IpcMainUtil.sendToRenderer(mainWindow, IpcChannel.getDouyinRoomDataReply, url, true, result)
          } else {
            IpcMainUtil.sendToRenderer(mainWindow, IpcChannel.getDouyinRoomDataReply, url, false)
          }
          if (browserWindow) {
            browserWindow.destroy()
            browserWindow = null
          }
          failed = false
        })
      })
      // 超时未响应关闭窗口，返回失败,6秒
      await new Promise(resolve => {
        setTimeout(() => {
          if (failed && browserWindow) {
            browserWindow.destroy()
            browserWindow = null
          }
          IpcMainUtil.sendToRenderer(mainWindow, IpcChannel.getDouyinRoomDataReply, url, false)
          resolve()
        }, 60000)
      })
    } catch (e) {
      IpcMainUtil.sendToRenderer(mainWindow, IpcChannel.getDouyinRoomDataReply, url, false)
    }
  })
}

function createTray () {
  tray = new Tray(path.join(__static, getTrayImageFileName()))
  let menu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏 窗口',
      click: () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    }
  ])
  tray.setContextMenu(menu)
  tray.setToolTip(getAppName())
  tray.on('click', () => mainWindow.show())
}

function getTrayImageFileName () {
  switch (process.platform) {
    case 'win32':
      return 'tray.ico'
    case 'darwin':
    case 'linux':
    default:
      return 'tray.png'
  }
}

function startGatewayExchangeServer () {
  // 内嵌服务支持修改UA等
  const expressServer = express()
  // 自定义跨域中间件
  const allowCors = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    res.header('Access-Control-Allow-Headers', '*')
    res.header('Access-Control-Allow-Credentials', 'true')
    next()
  }
  // 使用跨域中间件
  expressServer.use(allowCors)
  // 解析body
  expressServer.use(bodyParser.json())
  // 转发请求
  expressServer.post('/gateway/exchange', function (req, resp) {
    axios.request(req.body.config).then(res => {
      resp.status(200)
      resp.send(res.data)
    }).catch(e => {
      resp.status(500)
      resp.send(e.message)
    })
  })
  expressServer.listen(getGatewayExchangeServerPort(), 'localhost')
}

function init () {
  if (tray) {
    // 如果已存在托盘，销毁后再创建
    tray.destroy()
  }
  createTray()
  createWindow()
  startGatewayExchangeServer()
}
// 使用通知必填
app.setAppUserModelId(getAppName())

app.on('ready', init)

app.on('window-all-closed', (e) => {
  if (tray) {
    // 销毁托盘，防止多次启动后关闭未及时销毁
    tray.destroy()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
