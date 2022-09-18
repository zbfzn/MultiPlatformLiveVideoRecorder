<template>
  <common-page
      element-loading-spinner="el-icon-loading"
    >
    <template slot="header">
      <el-tooltip placement="top" :open-delay="1000">
        <div slot="content">新增录制任务</div>
        <el-button type="primary" icon="el-icon-zb-recorder" size="mini" @click="addRecord"></el-button>
      </el-tooltip>
      <el-tooltip placement="top" :open-delay="1000">
        <div slot="content">刷新</div>
        <el-button icon="el-icon-refresh" size="small" @click="refreshTableData"></el-button>
      </el-tooltip>
      <el-tooltip placement="top" :open-delay="1000">
        <div slot="content">停止所有录制任务</div>
        <el-button type="warning" icon="el-icon-circle-check" size="small" @click="stopAllRecords"></el-button>
      </el-tooltip>
      <el-tooltip placement="top" effect="light" :open-delay="1000" style="margin-left: 10px;">
        <div slot="content">移除所有录制任务</div>
        <el-button type="danger" icon="el-icon-zb-clear" size="mini" @click="removeAll"></el-button>
      </el-tooltip>
    </template>
    <template slot="main">
      <el-table
          ref="recordTable"
          show-header
          :data="tableData"
          :key="tableKey"
          row-key="_id"
          size="small"
          style="padding: 0;"
      >
        <el-table-column
            label="平台"
            sortable
            :sort-method="(a, b) => a.platform.name > b.platform.name ? 1 : -1">
          <template scope="scope">
            <label class="text-platform" @click="jumpToPlatformWebsite(scope.row.platform)">{{scope.row.platform.name}}</label>
          </template>
        </el-table-column>
        <el-table-column
            label="ID"
        >
          <template scope="scope">
            <el-badge v-if="scope.row.settings.top === 1" value="Top" class="customer-badge-box">
              <label class="text-common text-user-info customer-badge-content" @click="jumpToUserRoomOrHome(scope.row.platform, scope.row.user)">{{scope.row.user.idShow}}</label>
            </el-badge>
            <label v-else class="text-common text-user-info" @click="jumpToUserRoomOrHome(scope.row.platform, scope.row.user)">{{scope.row.user.idShow}}</label>
          </template>
        </el-table-column>
        <el-table-column
            label="昵称"
        >
          <template scope="scope">
            <label class="text-common text-user-info" @click="jumpToUserRoomOrHome(scope.row.platform, scope.row.user)">{{scope.row.user.name}}</label>
          </template>
        </el-table-column>
        <el-table-column
            label="状态">
          <template scope="scope">
            <el-button v-if="globalSettings.enableAutoCheck && scope.row.settings.autoCheck && (scope.row.status === 0)" icon="el-icon-loading" size="mini">等待中..</el-button>
            <el-button v-else-if="scope.row.status === -1" type="primary" icon="el-icon-loading" size="mini">检查中..</el-button>
            <el-button v-else-if="scope.row.status === 0" size="mini" disabled>未检查</el-button>
            <el-button v-else type="success" size="mini" icon="el-icon-loading">录制中..</el-button>
          </template>
        </el-table-column>
        <el-table-column
            label="线路">
          <template scope="scope">
            <label>{{scope.row.channelName}}</label>
          </template>
        </el-table-column>
        <el-table-column
            label="清晰度">
          <template scope="scope">
            <label>{{scope.row.qualityName}}</label>
          </template>
        </el-table-column>
        <el-table-column
            label="创建时间">
          <template scope="scope">
            <label>{{scope.row.createTime.Format('yyyy-MM-dd HH:mm:ss')}}</label>
          </template>
        </el-table-column>
        <el-table-column
            label="自动检查"
            width="100">
          <template scope="scope">
            <el-switch v-model="scope.row.settings.autoCheck" @change="(enable) => {autoCheckChange(enable, scope.row)}"></el-switch>
          </template>
        </el-table-column>
        <el-table-column
            label="操作"
            width="250"
        >
          <template scope="scope">
            <el-button v-if="scope.row.status !== 1" size="mini" icon="el-icon-video-play" @click="checkAndStart(scope.row, scope.$index)" :disabled="scope.row.status === -1"></el-button>
            <el-button v-else size="mini" type="warning" icon="el-icon-circle-check" @click="stopRecording(scope.row._id)"></el-button>
            <el-button size="mini" type="primary" icon="el-icon-setting" @click="editRecord(scope.row._id)"></el-button>
            <el-dropdown
                placement="bottom"
                trigger="click"
                @command="(command) => {onCommandChange(command, scope.row, scope.$index)}"
            >
              <el-button size="mini" type="success" icon="el-icon-more"></el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item  command="openOutPutDir"><em class="dropdown-menu-icon el-icon-folder"/> 打开文件夹</el-dropdown-item>
                <el-dropdown-item command="recordHistory"><em class="dropdown-menu-icon el-icon-zb-history"/>录制记录</el-dropdown-item>
                <el-dropdown-item v-if="scope.row.settings.autoCheck" command="disableAutoCheck"><em class="dropdown-menu-icon el-icon-zb-jinyong"/>关闭自动检查</el-dropdown-item>
                <el-dropdown-item v-else command="enableAutoCheck"><em class="dropdown-menu-icon el-icon-zb-qiyong"/>开启自动检查</el-dropdown-item>
                <el-dropdown-item v-if="scope.row.settings.top === 1" command="cancelTop"><em class="dropdown-menu-icon el-icon-zb-quxiaozhiding"/>取消置顶</el-dropdown-item>
                <el-dropdown-item v-else command="top"><em class="dropdown-menu-icon el-icon-zb-zhiding"/>置顶</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
            <el-popconfirm
                title="确定删除此任务吗？"
                @confirm="removeRecord(scope.row._id)"
                :disabled="scope.row.status !== 0"
            >
              <el-button slot="reference" size="mini" type="danger" icon="el-icon-delete" :disabled="scope.row.status !== 0"></el-button>
            </el-popconfirm>
<!--            <el-button size="mini" type="danger" icon="el-icon-delete" @click="removeRecord(scope.row._id)" :disabled="scope.row.status === 1"></el-button>-->
          </template>
        </el-table-column>
        <el-empty slot="empty" :image-size="300"></el-empty>
      </el-table>
    </template>
    <template slot="footer">
      <el-pagination
          background
          layout="total, prev, pager, next, jumper"
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          @current-change="onPageChange"
          @prev-click="onPageChange"
          @next-click="onPageChange">
      </el-pagination>
    </template>
  </common-page>
</template>

<script>
import CommonPage from '../../CommonPage'
import SysNotice from '../../../config/SysNotice'
import {getSettings} from '../../../config/settings'
import LivePlatform from '../../../live-platform/index'
import {remote} from 'electron'
export default {
  name: 'Index',
  components: {CommonPage},
  mounted () {
    console.log(this.$manager)
    const callback = this.getStatusChangeCallbackInstance()
    this.$manager.recordManager.setStatusChangeListener(callback)
    // 如果是返回到此页面，如果有页面信息则初始化(解决编辑等未改变任务条数的操作返回后跳转到首页的问题)
    if (this.$route.params && this.$route.params.pageInfo) {
      let pageInfo = this.$route.params.pageInfo
      if (pageInfo.page != null && pageInfo.pageSize != null && pageInfo.total != null) {
        this.page = pageInfo.page
        this.pageSize = pageInfo.pageSize
        this.total = pageInfo.total
      }
    }
    // 获取设置
    getSettings().then(settings => {
      if (settings) {
        this.globalSettings = settings
      } else {
        this.globalSettings = this.$manager.recordManager.globalSettings
      }
      console.log({settings: this.globalSettings})
      // 外层不能使用keep-live组件，否则导致路由切换不刷新
      this.refreshTableData()
    }).catch(e => {
      console.log(e)
      this.$message.error('获取软件设置失败!')
      this.$router.back()
    })
  },
  data () {
    return {
      tableData: [],
      tableKey: 0,
      isFirst: true,
      page: 1,
      pageSize: 11,
      total: 0,
      globalSettings: {}
    }
  },
  beforeRouteEnter (to, from, next) {
    console.log('进入了')
    console.log({to, from, next})
    next()
  },
  beforeRouteLeave (to, from, next) {
    console.log('离开了')
    console.log({to, from, next})
    next()
  },
  methods: {
    /**
     * 改变table行数据，触发更新
     * @param record 新值
     * @param beforeUpdate {Function}
     */
    changeRecordRow (record, beforeUpdate) {
      // 遍历获取当前table数据中与record匹配的行
      for (let i = 0; i < this.tableData.length; i++) {
        if (this.tableData[i]._id === record._id) {
          // 更新
          const recordUpdated = this.tableData[i]
          beforeUpdate(recordUpdated)
          // 使用$set没刷新，故使用splice
          this.tableData.splice(i, 1, recordUpdated)
          break
        }
      }
    },
    getStatusChangeCallbackInstance () {
      const recordManager = this.$manager.recordManager
      const callback = recordManager.newStatusChangeListener()
      callback.onStartCheck((options, record) => {
        this.changeRecordRow(record, recordUpdated => {
          recordUpdated.status = recordManager.recordStatus.checking
        })
      }).onEndCheck((options, record, isLive, continueRecord) => {
        if (!isLive) {
          this.changeRecordRow(record, recordUpdated => {
            recordUpdated.status = recordManager.recordStatus.waitToCheck
          })
          console.log(`${record.user.name} 未开播！`)
          if (options.showMessage) {
            this.$message.warning(`${record.user.name} 未开播！`)
          }
        }
        if (!continueRecord) {
          // 重复录制重置状态
          this.changeRecordRow(record, recordUpdated => {
            recordUpdated.status = recordManager.recordStatus.waitToCheck
          })
        }
      }).onStart((options, record, recordHistory) => {
        this.changeRecordRow(record, recordUpdated => {
          recordUpdated.status = recordManager.recordStatus.recording
          recordUpdated.qualityName = recordHistory.quality.name
          recordUpdated.channelName = recordHistory.channel.name
        })
        // 发送通知开始录制
        SysNotice.createNotice(`开始录制`, `${record.platform.name} - ${record.user.name}`)
        console.log('开始录制' + record._id)
      }).onDoing((options, record, recordHistory) => {
        this.changeRecordRow(record, recordUpdated => {
          recordUpdated.status = recordManager.recordStatus.recording
          recordUpdated.qualityName = recordHistory.quality.name
          recordUpdated.channelName = recordHistory.channel.name
        })
      }).onEnd((options, record) => {
        this.changeRecordRow(record, recordUpdated => {
          recordUpdated.status = recordManager.recordStatus.waitToCheck
          recordUpdated.qualityName = ''
          recordUpdated.channelName = ''
        })
        console.log('录制完成' + record._id)
      }).onError((options, record, e) => {
        this.changeRecordRow(record, recordUpdated => {
          recordUpdated.status = recordManager.recordStatus.waitToCheck
          recordUpdated.qualityName = ''
          recordUpdated.channelName = ''
        })
        console.log({m: '录制出错', id: record._id, e})
        if (options.showMessage) {
          this.$message.error(`${record.user.name} 录制出错: ${e.message}`)
        }
      })
      return callback
    },
    autoCheckChange (enable, record) {
      this.$dbs.record._update_({_id: record._id}, {$set: {'settings.autoCheck': enable}}, {}).then(_ => {
        // 刷新表格行数据
        this.changeRecordRow(record, recordUpdated => {
          recordUpdated.settings.autoCheck = enable
        })
      }).catch(e => {
        this.$message.error(`录制任务${record.user.name}: {enable ? '启用' : '禁用'}自动检查失败`)
        // 刷新表格行数据
        this.changeRecordRow(record, recordUpdated => {
          // 回退之前启用状态
          recordUpdated.settings.autoCheck = !enable
        })
      })
    },
    async onCommandChange (command, record, rowId) {
      switch (command) {
        case 'openOutPutDir':
          this.openRecordHomeFolder(record)
          break
        case 'recordHistory':
          // 跳转录制记录
          this.$routeTo('history', 'RecordHistory', {id: record._id, pageInfo: {page: this.page, pageSize: this.pageSize, total: this.total}})
          break
        case 'disableAutoCheck':
          console.log('禁用' + command + record._id)
          await this.$dbs.record._update_({_id: record._id}, {$set: {'settings.autoCheck': false}}, {}).then(_ => {
            // 刷新表格行数据
            this.changeRecordRow(record, recordUpdated => {
              recordUpdated.settings.autoCheck = false
            })
          }).catch(e => {
            this.$message.error('禁用自动检查失败')
          })
          break
        case 'enableAutoCheck':
          this.$dbs.record._update_({_id: record._id}, {$set: {'settings.autoCheck': true}}, {}).then(_ => {
            this.changeRecordRow(record, recordUpdated => {
              recordUpdated.settings.autoCheck = true
            })
          }).catch(e => {
            this.$message.error('启用自动检查失败')
          })
          break
        case 'top':
          this.$dbs.record._update_({_id: record._id}, {$set: {'settings.top': 1}}, {}).then(_ => {
            // 刷新表格
            this.refreshTableData()
          }).catch(e => {
            this.$message.error('置顶失败')
          })
          break
        case 'cancelTop':
          // 取消置顶时设置为undefined, 防止取消置顶后排序与原来不一致
          this.$dbs.record._update_({_id: record._id}, {$set: {'settings.top': undefined}}, {}).then(_ => {
            // 刷新表格
            this.refreshTableData()
          }).catch(e => {
            this.$message.error('取消置顶失败')
          })
          break
      }
    },
    openRecordHomeFolder (record) {
      const fullPath = this.$manager.recordManager.getRecordHomePath(record)
      this.$electron.shell.openExternal(fullPath, {activate: true})
    },
    editRecord (_id) {
      // 跳转设置编辑页
      this.$routeTo('edit', 'RecordEdit', {id: _id, pageInfo: {page: this.page, pageSize: this.pageSize, total: this.total}})
    },
    addRecord () {
      // 跳转新增录制任务也页
      this.$routeTo('add', 'RecordAdd', {id: null, pageInfo: {page: this.page, pageSize: this.pageSize, total: this.total}})
    },
    checkAndStart (record, rowId) {
      // 检查并启动录制
      this.$manager.recordManager.checkAndStartRecord(record._id, {showMessage: true})
    },
    stopRecording (recordId) {
      this.$message.info('已停止录制，视频处理中...')
      this.$manager.recordManager.stopRecord(recordId)
    },
    async stopAllRecords () {
      if (await this.$manager.recordManager.isRecording()) {
        this.$confirm('此操作将停止所有录制中的任务, 是否继续?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(_ => {
          this.$manager.recordManager.stopAll()
          this.$message.success('已停止所有录制任务')
        }).catch(e => {
          // 取消
        })
      } else {
        this.$message.warning('没有录制中的任务')
      }
    },
    getClientHeight () {
      if (document.body.clientHeight && document.documentElement.clientHeight) {
        return (document.body.clientHeight < document.documentElement.clientHeight) ? document.body.clientHeight : document.documentElement.clientHeight
      } else {
        return (document.body.clientHeight > document.documentElement.clientHeight) ? document.body.clientHeight : document.documentElement.clientHeight
      }
    },
    onPageChange (cur) {
      this.page = cur
      this.$nextTick(_ => {
        this.refreshTableData()
      })
    },
    async refreshTableData () {
      let page = this.page
      let count = await this.$dbs.record._count_({}).catch(e => {
        if (e) {
          this.$message.error('获取数据失败')
        }
      })
      if (count <= (page - 1) * this.pageSize) {
        console.log('此页数据为空返回上一页')
        page = page > 1 ? page - 1 : 1
        this.page = page
      }
      this.$dbs.record.$find({}).sort({'settings.top': -1, createTime: -1}).limit(this.pageSize).skip((page - 1) * this.pageSize).then((error, docs) => {
        console.log({a: 'refresh', docs})
        if (error) {
          this.$message.error('获取录制任务列表失败:' + error.message)
          return
        }
        this.$nextTick(_ => {
          this.tableData = docs
          this.tableKey = (this.tableKey + 1) % 5
          this.total = count
          console.log({a: 'after', b: this.tableData})
          this.$nextTick(() => {
            for (let index = 0; index < this.tableData.length; index++) {
              const doc = this.tableData[index]
              if (doc.status === 1) {
                // 查询当前的录制历史线路、清晰度信息
                this.$manager.recordManager.getRecordingQualityAndChannel(doc._id).then(info => {
                  doc.qualityName = info.qualityName
                  doc.channelName = info.channelName
                  this.tableData.splice(index, 1, doc)
                }).catch(e => {
                  console.log('查询录制历史线路等信息出错：' + e.message)
                })
              }
            }
          })
        })
      })
    },
    async removeRecord (recordId) {
      let records = await this.$dbs.record._find_({_id: recordId, status: this.$manager.recordManager.recordStatus.recording})
      if (records && records.length > 0) {
        this.$message.error('录制中的任务不能删除，请停止录制再操作')
        return
      }
      try {
        this.$dbs.record.remove({_id: recordId}, (e, num) => {
          if (!e) {
            // 移除录制记录
            this.$dbs.recordHistory._remove_({recordId: recordId}, {multi: true}).then(_ => {
              this.$message.success('删除成功')
              this.refreshTableData()
            })
          } else {
            this.$message.error('删除失败')
          }
        })
      } catch (e) {
        this.$message.error('删除失败')
      }
    },
    removeAll () {
      this.$confirm('此操作将移除所有任务及历史记录, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await this.$manager.recordManager.stopAll()
          const num = await this.$dbs.record._remove_({}, {multi: true})
          if (num) {
            this.$dbs.recordHistory._remove_({}, {multi: true}).then(_ => {
              this.$message.success('删除成功')
              this.refreshTableData()
            })
          }
        } catch (e) {
          console.log('remove all error: ' + e.message)
          this.$message.error('删除失败')
        }
      }).catch(() => {
        console.log('cancel remove all')
      })
    },
    /**
     * 跳转至平台主页
     * @param platform 平台信息
     */
    jumpToPlatformWebsite (platform) {
      if (platform.website) {
        remote.shell.openExternal(platform.website)
      }
    },
    /**
     * 跳转至用户房间或主页
     * @param platform 平台信息
     * @param user 用户信息
     */
    jumpToUserRoomOrHome (platform, user) {
      for (let platform_ of LivePlatform.platforms) {
        if (platform_.platformInfo.code === platform.code) {
          const roomOrHomeUrl = platform_.getUserRoomOrHomeUrl(user)
          if (roomOrHomeUrl) {
            remote.shell.openExternal(roomOrHomeUrl)
          }
          break
        }
      }
    },
    async downloadVideo () {
      // // debugger
      // let ws = fs.createWriteStream('f:/live-Record-videos/en777-11-17.flv')
      // let url = 'http://al.flv.huya.com/src/89025392-89025392-382361147153580032-178174240-10057-A-0-1.flv?wsSecret=9581c422cb58d6ef887b9a59533b015c&wsTime=61951726&u=0&seqid=16371607502680000&ctype=huya_tars&txyp=o%3Ac12%3B&fs=bgct&&sphdcdn=al_7-tx_3-js_3-ws_7-bd_2-hw_2&sphdDC=huya&sphd=264_*-265_*&ratio=0'
      // request(url, {
      //   headers: {
      //     'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36'
      //   }
      // }).on('response', res => {
      //   res.pipe(ws)
      // }).on('error', e => {
      //   ws.close()
      // }).on('end', () => {
      //   ws.close()
      // })
    }
  }
}
</script>

<style scoped>
.text-common {
  color: black;
  font-weight: bold;
}

.text-platform {
  color: #409EFF;
  font-weight: bold;
}
.text-platform:hover {
  cursor: pointer;
}
.text-user-info:hover {
  cursor: pointer;
  color: #409EFF;
}
.el-pagination {
  width: 100%;
  text-align: right;
}
.dropdown-menu-icon {
  margin-right: 5px;
}
.customer-badge-box {
  margin-top: 10px;
}
.customer-badge-content {
  padding: 5px 10px 0 0;
}
</style>
