import Vue from 'vue'
import {illegalPathCharRemove, sleep} from '../../helper'
import videoDownloadAdapters from '../video-download-adapter'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import log from '../config/log'
import VideoDownloadAdapter from '../video-download-adapter/VideoDownloadAdapter'

const downloadManager = new Vue({
  functional: true,
  data () {
    return {
      downloadRecordStatus: {
        failed: -1,
        waiting: 0,
        parsing: 1,
        downloading: 2,
        success: 3,
        cancel: 4,
        unexpectedExit: 5
      },
      downloadListenerRunning: true,
      // 最大并行下载数
      maxConcurrentDownloadNum: 5,
      // 下载队列
      queue: [],
      stopFfmpegDownloadCallback: {},
      downloadChangeListener: null
    }
  },
  methods: {
    async init () {
      log.info('初始化下载管理器')
      // 修改意外退出下载记录状态
      await this.tagUnexpectedDownloadRecord()
      while (this.downloadListenerRunning) {
        try {
          // 监听下载任务
          log.info('监听下载任务...')
          const downloadRecords = await this.$dbs.downloadRecord.$find_({status: this.downloadRecordStatus.waiting}).sort({createTime: 1}).limit(this.maxConcurrentDownloadNum).execute()
          for (let downloadRecord of downloadRecords) {
            // 开始下载
            if (this.queue.length < this.maxConcurrentDownloadNum && this.queue.indexOf(downloadRecord._id) < 0) {
              try {
                this.queue.push(downloadRecord._id)
                await this.startDownload(downloadRecord._id)
                log.info(`开始下载视频：地址=${downloadRecord.url}`)
              } catch (e) {
                await this.updateFailedDownloadStatus(downloadRecord._id, e)
              }
            }
          }
          // 睡眠1秒
          await sleep(1000)
        } catch (e) {
          console.log('下载任务入队出错：', e)
        }
      }
    },
    async tagUnexpectedDownloadRecord  () {
      try {
        await this.$dbs.downloadRecord._update_({status: {$in: [this.downloadRecordStatus.parsing, this.downloadRecordStatus.downloading]}}, {$set: {
          status: this.downloadRecordStatus.unexpectedExit,
          errorMsg: '程序异常退出,终止下载'
        }}, {multi: true})
      } catch (e) {
        log.error('标记异常终止下载任务失败: ' + e.message)
      }
    },
    async startDownload (downloadRecordId) {
      const downloadRecord = (await this.$dbs.downloadRecord._find_({_id: downloadRecordId}))[0]
      await this.updateParsingDownloadStatus(downloadRecordId)
      const Adapter = videoDownloadAdapters.getAdapter(downloadRecord.adapter.code)
      if (!Adapter) {
        // 无匹配适配器
        await this.updateFailedDownloadStatus(downloadRecordId, new Error('未找到匹配的下载适配器!'))
        return
      }
      if (!fs.existsSync(downloadRecord.downloadFolder)) {
        try {
          // 递归创建文件夹
          fs.mkdirsSync(downloadRecord.downloadFolder)
        } catch (e) {
          await this.updateFailedDownloadStatus(downloadRecordId, new Error(`创建文件夹【${downloadRecord.downloadFolder}】失败，【${e.message}】！`))
          return
        }
      }
      const downloadInfo = await (new Adapter().getDownloadInfo(downloadRecord.url, downloadRecord.preferenceQuality))
      if (!downloadInfo) {
        await this.updateFailedDownloadStatus(downloadRecordId, new Error(`获取下载地址失败`))
        return
      }
      // 获取总时长的regexp
      const durationRegexp = /Duration: \s?(\d+):(\d+):(\d+.(?:\d+)?)/
      const currentTimeRegexp = /frame=.*time=(\d+):(\d+):(\d+.(?:\d+)?)/
      // 是否手动取消
      let isCanceled = false
      // 视频时长 (秒)
      let videoTotalTime = null
      // 视频已下载完成时长（秒）
      let videoDownloadedTime = null
      // 调用ffmpeg下载
      const command = ffmpeg()
      // 设置全局默认参数
      // 设置IO超时时间，单位微妙((us), 20秒， 解决断网或者IO流结束后仍然在录制不能断开的问题
      command.outputOptions('-rw_timeout', 20000000)
      // 覆写
      command.outputOptions('-y')
      VideoDownloadAdapter.setFFmpegOutputOptions(command, downloadInfo.ffmpegCommandOutputOption)
      // 输出格式设置,-i后设置
      const videoOutPutFormatOptions = Adapter.supportVideoOutPutFormats[downloadRecord.fileFormat]
      if (!videoOutPutFormatOptions) {
        // 格式不支持
        await this.updateFailedDownloadStatus(downloadRecordId, new Error(`此平台不支持${downloadRecord.fileFormat}格式视频输出！`))
        return
      } else {
        // 追加视频输出格式参数FFmpegOutputOptions
        VideoDownloadAdapter.setFFmpegOutputOptions(command, videoOutPutFormatOptions)
      }
      const fileName = `${illegalPathCharRemove(downloadInfo.owner)}-${illegalPathCharRemove(downloadInfo.title)}.${downloadRecord.fileFormat}`
      const filePath = path.join(downloadRecord.downloadFolder, fileName)
      // 设置输出文件路径
      command.output(filePath)
        .on('error', async e => {
          console.log(e)
          await this.updateFailedDownloadStatus(downloadRecordId, new Error(`下载失败：${e.message}`))
          // 移除停止回调
          this.removeStopCallback(downloadRecordId)
        })
        .on('end', async (stdout, stderr) => {
          console.log(stdout, stderr)
          // 下载完成，更新进度
          if (!isCanceled) {
            if (videoTotalTime != null && videoDownloadedTime != null && (videoTotalTime - videoDownloadedTime < 1)) {
              // 视频完整下载完成
              await this.updateSuccessDownloadStatusAndProgress(downloadRecordId)
            } else {
              // 视频下载未完成就退出
              await this.updateFailedDownloadStatus(downloadRecordId, new Error('下载失败：FFMPEG退出时视频未开始下载或未完整下载完成'))
            }
          }
          // 移除停止回调
          this.removeStopCallback(downloadRecordId)
        })
        .on('stderr', async line => {
          console.log(line)
          if (isCanceled) {
            // 取消了就不更新进度
            return
          }
          if (videoTotalTime == null) {
            // 计算视频总时长
            const find = durationRegexp.exec(line)
            if (find) {
              videoTotalTime = find[1] * 60 * 60 + find[2] * 60 + find[3] * 1
            }
          } else {
            // 更新进度
            const find = currentTimeRegexp.exec(line)
            if (find) {
              const videoCurrentTime = find[1] * 60 * 60 + find[2] * 60 + find[3] * 1
              if (videoCurrentTime != null && typeof videoCurrentTime === 'number') {
                // 保存当前下载时长
                videoDownloadedTime = videoCurrentTime
                // 进度保留四位小数，百分比保留两位小数
                let progress = String(Math.ceil(videoCurrentTime / videoTotalTime * 10000) / 10000)
                try {
                  progress = Number(/(0\.\d{4})/.exec(progress)[1])
                  await this.updateDownloadingDownloadProgress(downloadRecordId, progress)
                } catch (ignore) {
                  //
                }
              }
            }
          }
        })
      await this.updateDownloadingDownloadStatus(downloadRecordId, downloadInfo.quality, filePath, downloadInfo.title ? downloadInfo.title : downloadRecord.title)
      // 运行ffmpeg，开始下载
      command.run()
      // 强制停止下载任务回调
      this.stopFfmpegDownloadCallback[downloadRecordId] = async () => {
        isCanceled = true
        command.ffmpegProc && command.ffmpegProc.stdin.write('q')
        // 标记为失败
        await this.updateCancelDownloadStatus(downloadRecordId)
      }
    },
    async addDownloadTask (adapter, preferenceQuality, downloadFolder, fileFormat, videoDetails) {
      const downloadRecords = []
      for (let videoDetail of videoDetails) {
        downloadRecords.push({
          adapter: {
            code: adapter.code,
            name: adapter.name
          },
          preferenceQuality: preferenceQuality,
          videoId: videoDetail.id,
          url: videoDetail.url,
          downloadFolder: downloadFolder,
          quality: null,
          filePath: null,
          fileFormat: fileFormat,
          title: videoDetail.title,
          cover: videoDetail.cover,
          status: 0,
          errorMsg: null,
          // 进度，[0, 1]
          progress: 0,
          createTime: new Date(),
          startDownloadTime: new Date(),
          downloadFinishedTime: new Date()
        })
      }
      const newDoc = await this.$dbs.downloadRecord._insert_(downloadRecords).catch(e => {
        this.$message.error('添加下载任务失败')
      })
      await this.updateAddDownloadRecordStatus(newDoc._id)
    },
    addDownloadChangeListener (listener) {
      this.downloadChangeListener = listener
    },
    cancelDownload (downloadRecordId) {
      this.removeFromQueue(downloadRecordId)
      this.stopFfmpeg(downloadRecordId)
    },
    stopFfmpeg (downloadRecordId) {
      this.stopFfmpegDownloadCallback[downloadRecordId] && this.stopFfmpegDownloadCallback[downloadRecordId]()
    },
    removeFromQueue (downloadRecordId) {
      const index = this.queue.indexOf(downloadRecordId)
      index > -1 && this.queue.splice(index, 1)
    },
    removeStopCallback (downloadRecordId) {
      // 移除停止回调
      this.stopFfmpegDownloadCallback[downloadRecordId] && delete this.stopFfmpegDownloadCallback[downloadRecordId]
    },
    isDownloading () {
      return new Promise(resolve => {
        if (this.queue.length > 0) {
          resolve(true)
        } else {
          resolve(false)
        }
      })
    },
    stopAll () {
      for (let id of this.queue) {
        this.cancelDownload(id)
      }
    },
    onAllDownloadRecordsStopped () {
      return new Promise(async resolve => {
        let time = 0
        while (await this.isDownloading()) {
          await sleep(100)
          time += 100
          if (time > 300000) {
            // 等待超过5分钟直接退出
            break
          }
        }
        resolve()
      })
    },
    async updateAddDownloadRecordStatus (id) {
      // 新增
      this.callFunctionWithValid(this.downloadChangeListener, 'add', id)
    },
    async updateFailedDownloadStatus (id, error) {
      console.log(error)
      this.removeStopCallback(id)
      this.removeFromQueue(id)
      await this.$dbs.downloadRecord._update_({_id: id}, {$set: {status: this.downloadRecordStatus.failed, errorMsg: error.message, downloadFinishedTime: new Date()}}, {multi: true})
      this.callFunctionWithValid(this.downloadChangeListener, 'failed', id, error)
      log.error(`下载视频失败：id=${id}`)
    },
    async updateParsingDownloadStatus (id) {
      await this.$dbs.downloadRecord._update_({_id: id}, {$set: {status: this.downloadRecordStatus.parsing, startDownloadTime: new Date()}}, {multi: true})
      // 开始解析
      this.callFunctionWithValid(this.downloadChangeListener, 'parsing', id)
    },
    async updateDownloadingDownloadStatus (id, quality, filePath, title) {
      await this.$dbs.downloadRecord._update_({_id: id}, {$set: {status: this.downloadRecordStatus.downloading, quality: quality, filePath: filePath, title: title}}, {multi: true})
      // 下载中
      this.callFunctionWithValid(this.downloadChangeListener, 'downloading', id)
    },
    async updateDownloadingDownloadProgress (id, progress) {
      await this.$dbs.downloadRecord._update_({_id: id, status: this.downloadRecordStatus.downloading}, {$set: {progress: progress}}, {multi: true})
      // 下载中
      this.callFunctionWithValid(this.downloadChangeListener, 'progressing', id, progress)
    },
    async updateSuccessDownloadStatusAndProgress (id) {
      this.removeStopCallback(id)
      this.removeFromQueue(id)
      await this.$dbs.downloadRecord._update_({_id: id, status: this.downloadRecordStatus.downloading}, {$set: {status: this.downloadRecordStatus.success, progress: 1, downloadFinishedTime: new Date()}}, {multi: true})
      // 下载成功
      this.callFunctionWithValid(this.downloadChangeListener, 'success', id, 1)
    },
    async updateCancelDownloadStatus (id) {
      await this.$dbs.downloadRecord._update_({_id: id}, {$set: {status: this.downloadRecordStatus.cancel, downloadFinishedTime: new Date()}}, {multi: true})
      // 取消下载
      this.callFunctionWithValid(this.downloadChangeListener, 'cancel', id)
    },
    callFunctionWithValid (object, funName, ...args) {
      if (!object) {
        console.log(`object is null, skip call function ${funName}`)
        return
      }
      if (!object[funName]) {
        console.log(`function is null, skip call function ${funName}`)
        return
      }
      if (typeof object[funName] !== 'function') {
        console.log(`object field is not a funtion, skip call function ${funName}`)
        return
      }
      object[funName](...args)
    }
  }
})

export default downloadManager
