import Vue from 'vue'
import log from '../config/log'
import livePlatform from '../live-platform/index'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import {illegalPathCharRemove, sleep} from '../../helper'
import {getSettings} from '../config/settings'
// import store from '../../main/store'

const recordManager = new Vue({
  functional: true,
  data () {
    return {
      hasInit: false,
      recordStatus: {
        checking: -1,
        waitToCheck: 0,
        recording: 1
      },
      recordHistoryStatus: {
        failed: -1,
        unexpectedExit: 0,
        recording: 1,
        success: 2
      },
      // queue: [],
      // recordQueueIndex: {},
      stopCallbackMap: {},
      // 设为false关闭自动扫描检查录制
      checkRunning: true,
      // 检查扫描窗口（ms）
      checkScanWindow: 1000,
      // 全局设置
      globalSettings: {
        enableAutoCheck: true,
        defaultOuPutDir: null
        // // 默认检查窗口
        // defaultCheckWindow: 10,
        // // 检查扫描窗口（ms）
        // checkScanWindow: 1000
      },
      statusChangeListener: null
    }
  },
  mounted () {
    console.log(this.$dbs.record.filename)
  },
  methods: {
    async init () {
      log.info('初始化录制管理')
      if (!this.hasInit) {
        // 防止多次加载导致正在正常录制任务重置
        this.hasInit = true
      } else {
        return
      }
      await this.fixDatabase()
      // 获取全局设置
      const gSettings = await getSettings()
      if (gSettings) {
        // 如果有设置则使用，否则使用默认设置
        this.globalSettings = gSettings
      }
      while (this.checkRunning) {
        if (!this.globalSettings.enableAutoCheck) {
          // 全局禁用检查时不进行扫描
          await sleep(this.checkScanWindow)
          continue
        }
        try {
          log.info('正在检查...')
          console.log(this.stopCallbackMap)
          console.log(Object.keys(this.stopCallbackMap))
          // 查询自动检查且未正在录制的记录
          const records = await this.$dbs.record._find_({'settings.autoCheck': true, status: {$ne: this.recordStatus.recording}}).catch(e => {
            log.error('获取自动检查录制列表失败')
          })
          if (!records || records.length === 0) {
            // 无自动检查的录制任务，1秒后再次扫描
            await sleep(this.checkScanWindow)
            continue
          }
          for (const record of records) {
            if (this.stopCallbackMap[record._id]) {
              // 正在录制，跳过
              continue
            }
            // 录制任务设置的检查窗口（间隔）时间
            const checkWindow = Number(record.settings.checkWindow)
            if (!record.lastCheckTime || new Date().getTime() > record.lastCheckTime.getTime() + (checkWindow * 1000)) {
              // 当前时间大于上次检查时间+检查窗口，检查并启动录制
              console.log(`检查${record._id}`)
              this.checkAndStartRecord(record._id)
            }
          }
          // 1秒后再次扫描
          await sleep(this.checkScanWindow)
        } catch (e) {
          log.error('录制检查出错:' + e.message)
        }
      }
    },
    async fixDatabase () {
      // 先重置所有任务状态再循环检查
      await this.$dbs.record._update_({}, {$set: {status: this.recordStatus.waitToCheck}}, {multi: true})
      await this.$dbs.recordHistory._update_({status: this.recordHistoryStatus.recording}, {$set: {status: this.recordHistoryStatus.unexpectedExit, stopRecordTime: new Date()}}, {multi: true})
    },
    async fixUnexpectedRecordHistory () {
      try {
        const docs = await this.$dbs.recordHistory._find_({status: this.recordHistoryStatus.unexpectedExit})
        if (docs && docs.length > 0) {
          // 调用ffmpeg补齐关键帧
        }
      } catch (e) {
        console.log('修复意外退出导致损坏的录制文件失败: ' + e.message)
      }
    },
    newStatusChangeListener () {
      // start/end 只有开播才调用
      const changeListener = {
        startCheck: null,
        endCheck: null,
        start: null,
        doing: null,
        end: null,
        error: null,
        onStartCheck: function (call) {
          this.startCheck = call
          return changeListener
        },
        onEndCheck: function (call) {
          this.endCheck = call
          return changeListener
        },
        onStart: function (call) {
          this.start = call
          return changeListener
        },
        onDoing: function (call) {
          this.doing = call
          return changeListener
        },
        onEnd: function (call) {
          this.end = call
          return changeListener
        },
        onError: function (call) {
          this.error = call
          return changeListener
        }
      }
      return changeListener
    },
    getStatusChangeListenerHandler (listener) {
      return {
        startCheck: function (options, record) {
          if (listener && listener.startCheck) {
            if (!options) {
              options = {}
            }
            listener.startCheck(options, record)
          }
        },
        endCheck: function (options, record, isLive, continueRecord) {
          if (listener && listener.endCheck) {
            if (!options) {
              options = {}
            }
            continueRecord = continueRecord != null ? continueRecord : isLive
            listener.endCheck(options, record, isLive, continueRecord)
          }
        },
        start: function (options, record, recordHistory) {
          if (listener && listener.start) {
            if (!options) {
              options = {}
            }
            listener.start(options, record, recordHistory)
          }
        },
        doing: function (options, record, recordHistory) {
          if (listener && listener.doing) {
            if (!options) {
              options = {}
            }
            listener.doing(options, record, recordHistory)
          }
        },
        end: function (options, record) {
          if (listener && listener.end) {
            if (!options) {
              options = {}
            }
            listener.end(options, record)
          }
        },
        error: function (options, record, e) {
          if (listener && listener.error) {
            if (!options) {
              options = {}
            }
            listener.error(options, record, e)
          }
        }
      }
    },
    setGlobalSettings (globalSettings) {
      this.globalSettings = globalSettings
    },
    getRecordHomePath (record) {
      // 获取平台信息
      const Platform = livePlatform.getPlatform(record.platform.code)
      // 生成文件路径 ${outPutDir}/${platformName}/${userName}
      const fileDir = path.join(record.settings.outPutDir, path.join(illegalPathCharRemove(Platform.platformInfo.name), illegalPathCharRemove(record.user.name)))
      if (!fs.existsSync(fileDir)) {
        fs.mkdirsSync(fileDir)
      }
      return fileDir
    },
    /**
     * 获取正在录制的任务线路名称、清晰度名称
     * @param recordId
     * @return {Promise<unknown>}
     */
    getRecordingQualityAndChannel (recordId) {
      return new Promise(async (resolve, reject) => {
        // 查找最新一条正在录制的记录
        this.$dbs.recordHistory.$find({recordId: recordId, status: this.recordHistoryStatus.recording}).sort({startRecordTime: -1}).limit(1).then((e, docs) => {
          if (e) {
            reject(e)
          } else {
            resolve({
              qualityName: docs[0].quality.name,
              channelName: docs[0].channel.name
            })
          }
        })
      })
    },
    handlerListener () {
      return this.getStatusChangeListenerHandler(this.statusChangeListener)
    },
    setStatusChangeListener (listener) {
      this.statusChangeListener = listener
    },
    /**
     * 检查并启动录制
     * @param recordId 录制任务id
     * @param options 检查参数，回调时会传回
     * @return {Promise<void>}
     */
    async checkAndStartRecord (recordId, options) {
      console.log(await this.$dbs.record._find_({_id: recordId}))
      // 查询是否正在录制，如是则跳过此次操作并抛出异常提示
      let record = (await this.$dbs.record._find_({_id: recordId}))[0]
      if (record.status === this.recordStatus.recording) {
        // 不能重复录制
        this.handlerListener().error(options, record, new Error('正在录制中,请勿重复操作'))
        return
      }
      // 更新上次检查时间
      this.$dbs.record._update_({_id: record._id}, {$set: {lastCheckTime: new Date()}}, {}).catch(e => {
        if (e) {
          console.log('更新上次检查时间出错: ' + e.message)
        }
      })
      // 检查录制文件存储文件夹是否存在
      if (!fs.existsSync(record.settings.outPutDir)) {
        // 不存在则弹出提示（自动检查也会弹出）
        this.handlerListener().error({showMessage: true}, record, new Error(`路径‘${record.settings.outPutDir}’ 不存在！`))
        return
      }
      // 调用开始检查
      this.handlerListener().startCheck(options, record)
      // 获取平台信息
      const Platform = livePlatform.getPlatform(record.platform.code)
      // 获取实例
      const platformRoom = new Platform()
      // 检查开播状态并返回直播流信息
      platformRoom.check(record.user, record.settings.preferenceQuality, record.settings.preferenceChannel).then(async result => {
        if (!result) {
          // 未开播，调用
          // this.$message.warning(`${record.user.name} 未开播！`)
          this.handlerListener().endCheck(options, record, false)
          return
        }
        if (this.stopCallbackMap[record._id]) {
          // 已经在录制，放弃本次操作
          this.handlerListener().endCheck(options, record, true, false)
          return
        }
        this.handlerListener().endCheck(options, record, true)
        if ((await this.$dbs.record._count_({_id: recordId})) <= 0) {
          // 检查过程中任务被删除，放弃
          this.handlerListener().end(options, record)
          return
        }
        // 生成文件路径 ${outPutDir}/${platformName}/${userName}
        const fileDir = path.join(record.settings.outPutDir, path.join(illegalPathCharRemove(Platform.platformInfo.name), illegalPathCharRemove(record.user.name)))
        console.log(fileDir)
        // 不存在则创建
        fs.mkdirsSync(fileDir)
        const fileName = illegalPathCharRemove(`${new Date().Format('yyyy-MM-dd [HH-mm-ss]')} ${result.title}`) + `.${record.settings.fileFormat}`
        // 输出文件路径
        const outFilePath = path.join(fileDir, fileName)
        // 插入录制历史记录
        const recordHistory = {
          recordId: recordId,
          file: {
            name: fileName,
            format: record.settings.fileFormat,
            absolutePath: outFilePath
          },
          status: this.recordHistoryStatus.recording,
          quality: result.quality,
          channel: result.channel,
          title: result.title,
          startRecordTime: new Date(),
          stopRecordTime: null,
          errorMessage: null
        }
        // 插入一条录制记录
        let insertHistoryError = null
        const recordHistoryDoc = await this.$dbs.recordHistory._insert_(recordHistory).catch(e => {
          insertHistoryError = e
        })
        if (insertHistoryError) {
          // 出错
          this.handlerListener().error(options, record, insertHistoryError)
          return
        }
        // 上次自检时间，用于当任务进行中时不断调用回调onDoing
        let lastSelfCheckTime = null
        // 调用ffmpeg录制
        const command = ffmpeg()
        // 设置全局默认参数
        // 设置IO超时时间，单位微妙((us), 20秒， 解决断网或者IO流结束后任然在录制不能断开的问题
        command.outputOptions('-rw_timeout', 20000000)
        // 根据不同平台设置不同输出操作
        Platform.setFFmpegOutputOptions(command, result.ffmpegCommandOutputOption)
        // 输出格式设置
        const videoOutPutFormatOptions = Platform.supportVideoOutPutFormats[record.settings.fileFormat]
        if (!videoOutPutFormatOptions) {
          // 格式不支持
          this.handlerListener().error(options, record, Error(`此平台不支持${record.settings.fileFormat}格式视频输出！`))
          return
        } else {
          // 追加视频输出格式参数FFmpegOutputOptions
          Platform.setFFmpegOutputOptions(command, videoOutPutFormatOptions)
        }
        command.output(outFilePath)
          .on('error', async (e) => {
            // 录制出错，重置record, recordHistory标记为失败
            await this.$dbs.record._update_({_id: recordId}, {$set: {status: this.recordStatus.waitToCheck}}, {})
              .then(async _ => {
                await this.$dbs.recordHistory._update_({_id: recordHistoryDoc._id}, {$set: {status: this.recordHistoryStatus.failed, stopRecordTime: new Date(), errorMessage: e.message}}, {})
                this.handlerListener().error(options, record, e)
                this.removeStopCallback(recordId)
              }).catch(e1 => {
                this.handlerListener().error(options, record, e1)
                this.removeStopCallback(recordId)
              })
            console.log({m: 'ffmpeg error!!!', e})
          })
          .on('end', async () => {
            // 录制结束，重置record状态，recordHistory标记成功
            await this.$dbs.record._update_({_id: recordId}, {$set: {status: this.recordStatus.waitToCheck, lastCheckTime: new Date(), 'user.roomId': (result.roomId ? result.roomId : record.user.roomId)}}, {})
              .then(async _ => {
                await this.$dbs.recordHistory._update_({_id: recordHistoryDoc._id}, {$set: {status: this.recordHistoryStatus.success, stopRecordTime: new Date()}}, {})
                this.handlerListener().end(options, record)
                this.removeStopCallback(recordId)
              })
              .catch(e => {
                this.handlerListener().error(options, record, e)
                this.removeStopCallback(recordId)
              })
            console.log('end!!!')
          })
          .on('stderr', stderrLine => {
            // console.log(stderrLine)
            // 每5秒调用一次
            if (lastSelfCheckTime === null || new Date().getTime() > lastSelfCheckTime + 5000) {
              lastSelfCheckTime = new Date().getTime()
              this.handlerListener().doing(options, record, recordHistory)
            }
          })
        if (this.stopCallbackMap[record._id] !== undefined) {
          // 多次检查，检查期间有其他检查已经在录制，放弃本次操作
          console.log({a: '录制冲突，跳过', b: this.stopCallbackMap})
          return
        }
        await this.$dbs.record._update_({_id: recordId}, {$set: {status: this.recordStatus.recording}}, {}).then(_ => {
          command.run()
          this.stopCallbackMap[record._id] = () => {
            command.ffmpegProc && command.ffmpegProc.stdin.write('q')
          }
          if (record.settings.autoFragment) {
            // 启动分片
            this.startAutoFragment(recordId)
          }
          this.handlerListener().start(options, record, recordHistory)
        }).catch(e => {
          this.handlerListener().error(options, record, e)
          this.removeStopCallback(recordId)
        })
      }).catch(e => {
        this.handlerListener().error(options, record, e)
      })
    },
    async startAutoFragment (recordId) {
      console.log('分片录制任务')
      const startRecordTime = new Date().getTime()
      while (this.stopCallbackMap[recordId]) {
        const record = (await this.$dbs.record._find_({_id: recordId}))[0]
        const fragmentLength = !record.settings.fragmentLength ? 1800 : record.settings.fragmentLength
        if (record.settings.autoFragment && (new Date().getTime() - startRecordTime) > fragmentLength * 1000) {
          console.log('启动分片')
          // 分片停止当前录制，启动新录制(不传递options)
          this.stopRecord(recordId)
          while (await this.isRecording(recordId)) {
            await sleep(100)
          }
          this.checkAndStartRecord(recordId)
          break
        }
        if (record.status === this.recordStatus.waitToCheck) {
          break
        }
        await sleep(this.checkScanWindow)
      }
    },
    isRecording (recordId) {
      return new Promise(async resolve => {
        let docs = []
        if (recordId) {
          docs = await this.$dbs.record._find_({_id: recordId, status: this.recordStatus.recording})
        } else {
          docs = await this.$dbs.record._find_({status: this.recordStatus.recording})
        }
        if (docs && docs.length > 0) {
          return resolve(true)
        } else {
          return resolve(false)
        }
      })
    },
    removeStopCallback (recordId) {
      this.stopRecord(recordId)
    },
    stopRecord (recordId) {
      const stopCallback = this.stopCallbackMap[recordId]
      if (stopCallback) {
        stopCallback()
        delete this.stopCallbackMap[recordId]
      }
    },
    stopAll () {
      const recordIds = []
      for (const recordId of Object.keys(this.stopCallbackMap)) {
        recordIds.push(recordId)
      }
      for (const recordId of recordIds) {
        this.stopRecord(recordId)
      }
    },
    onAllRecordsStopped () {
      return new Promise(async resolve => {
        let time = 0
        while (await this.$manager.recordManager.isRecording()) {
          await sleep(100)
          time += 100
          if (time > 300000) {
            // 等待超过5分钟直接退出
            break
          }
        }
        resolve()
      })
    }
  },
  beforeDestroy () {
    this.checkRunning = false
    this.stopAll()
  }
})

export default recordManager
