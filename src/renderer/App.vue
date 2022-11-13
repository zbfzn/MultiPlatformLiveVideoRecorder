<template>
  <div id="app" class="common-full">
    <router-view v-loading.fullscreen.lock="waitTasksStop" element-loading-text="停止录制任务中"></router-view>
  </div>
</template>

<script>
  import {remote} from 'electron'
  import ipcRendererUtil from '../helper/ipcRendererUtil'
  import { checkAndRebuild } from './db'
  import manager from './manager'

  export default {
    name: 'live-video-recorder',
    data () {
      return {
        // 标记准备退出程序，防止有任务时多次点击窗口关闭按钮触发多次弹窗
        waitToExit: false,
        waitTasksStop: false,
        isRebuildingDatabase: true
      }
    },
    beforeMount () {
      checkAndRebuild(this.$dbs, e => {
        this.$message.error('检查并重建数据库文件错误：' + e.message)
      }, _ => {
        this.isRebuildingDatabase = true
        return this.$loading({
          lock: true,
          text: '重建数据库中...',
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        })
      }, _ => {
      }, loading => {
        this.isRebuildingDatabase = false
        if (loading) {
          loading.close()
        }
        manager.init()
      })
    },
    mounted () {
      // 监听关闭事件
      ipcRendererUtil.onStopAllTasks(this.showCloseTip)
    },
    methods: {
      isRunning () {
        return new Promise(async (resolve, reject) => {
          Promise.all([
            // 多个返回布尔值的Promise
            this.$manager.recordManager.isRecording(),
            this.$manager.downloadManager.isDownloading()
          ]).then(results => {
            resolve(results.indexOf(true) >= 0)
          }).catch(e => {
            reject(e)
          })
        })
      },
      beforeExit (vm) {
        // 停止录制
        vm.$manager.recordManager.checkRunning = false
        vm.$manager.recordManager.stopAll()
        vm.$manager.downloadManager.downloadListenerRunning = false
        vm.$manager.downloadManager.stopAll()
      },
      waitingToExit (vm) {
        // 等待退出
        Promise.all([
          vm.$manager.recordManager.onAllRecordsStopped(),
          vm.$manager.downloadManager.onAllDownloadRecordsStopped()
        ]).then(results => {
          // results为每个Promise返回的结果，有序
          vm.waitTasksStop = false
          vm.waitToExit = false
          remote.app.exit()
        })
      },
      async showCloseTip (event, message) {
        if (this.isRebuildingDatabase) {
          this.$message.warning('重建数据库中，不能退出！！')
          return
        }
        if (await this.isRunning()) {
          if (!this.waitToExit && !this.waitTasksStop) {
            this.waitToExit = true
            const that = this
            this.$msgbox({
              title: '提示',
              message: '尚有任务未完成，是否停止所有任务并退出？',
              type: 'warning',
              showCancelButton: true,
              confirmButtonText: '确定',
              cancelButtonText: '取消'
            }).then(async (action) => {
              if (action === 'confirm') {
                that.waitTasksStop = true
                // 退出前做的事，调用的方法异步执行，如调用停止录制方法
                that.beforeExit(that)
                // 等待退出，退出可能需要花费一点时间处理不能立即退出
                this.waitingToExit(that)
              }
            }).catch((e) => {
              this.waitTasksStop = false
              this.waitToExit = false
            })
          }
        } else {
          this.$manager.recordManager.checkRunning = false
          remote.app.exit()
        }
      }
    }
  }
</script>

<style>
   /*CSS */

  html, body {
    width: 99.6%;
    height: 99%;
    margin: 0.2%;
    padding: 0;
  }

  div.common-full {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }
  .el-container {
    background-color: #eeeeee;
  }
</style>
