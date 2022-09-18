<template>
  <sub-page ref="subPage">
    <template slot="main">
      <el-header style="padding: 0;">
        <el-button icon="el-icon-refresh" @click="listRecordHistory" size="mini">刷新</el-button>
        <el-button :disabled="multipleSelection == null || multipleSelection.length === 0" type="danger" icon="el-icon-zb-clear" size="mini" @click="removeMultipleSelection">移除选中项</el-button>
        <div style="display:inline;border: #f1f1f1 solid 1px; border-radius: 5px; margin-left: 20%; margin-right: 10px;right: 10px;padding: 11px 8px 12px 8px">
          <!-- 搜索框 -->
          <el-input v-model="query.keyword" style="width: 200px;" size="small" clearable placeholder="文件名、标签(支持正则)" @keydown.native="onQueryInputKeydown"></el-input>
          <el-select v-model="query.status" size="small" clearable placeholder="请选择录制状态">
            <el-option label="全部" :value="''"></el-option>
            <el-option label="录制错误" :value="-1"></el-option>
            <el-option label="意外停止" :value="0"></el-option>
            <el-option label="录制中" :value="1"></el-option>
            <el-option label="录制完成" :value="2"></el-option>
          </el-select>
          <el-button icon="el-icon-search" size="small" type="primary" @click="listRecordHistory">搜索</el-button>
        </div>
      </el-header>
      <el-table
          ref="recordTable"
          show-header
          :data="tableData"
          v-loading.="tableDataLoading"
          @cell-mouse-enter="onRowHoverEnter"
          @selection-change="handleSelectionChange"
          row-key="_id"
          size="small"
          style="padding: 0;"
          height="100%"
          highlight-current-row
      >
        <el-table-column
          type="selection"
        >
        </el-table-column>
        <el-table-column
            label="文件名"
        >
          <template scope="scope">
            <el-popover
                v-if="scope.row.tags && scope.row.tags.length > 0"
                v-model="scope.row.tagsShow"
                placement="right-end"
                trigger="hover">
              <div @mouseenter="onPopoverHoverEnter(scope.row)">
                <el-tag v-for="(tag, index) in scope.row.tags" :key="index" style="margin-left: 7px"
                        :type="['primary', 'warning', 'success', 'danger'][index % 4]"
                        closable @close="removeTag(scope.row._id, tag)">{{tag}}</el-tag>
              </div>
              <label slot="reference" class="text-common">{{scope.row.file.name}}</label>
            </el-popover>
            <label v-else class="text-common">{{scope.row.file.name}}</label>
          </template>
        </el-table-column>
        <el-table-column
            label="状态">
          <template scope="scope">
            <el-tooltip v-if="scope.row.status === -1" placement="top">
              <div slot="content">{{scope.row.errorMessage}}</div>
              <el-button type="danger" size="mini">录制出错</el-button>
            </el-tooltip>
            <el-button v-else-if="scope.row.status === 0" type="warning" size="mini">意外停止</el-button>
            <el-button v-else-if="scope.row.status === 1" type="primary" size="mini">录制中..</el-button>
            <el-button v-else type="success" size="mini">录制完成</el-button>
          </template>
        </el-table-column>
        <el-table-column
            label="线路"
            width="100"
        >
          <template scope="scope">
            <label>{{scope.row.channel.name}}</label>
          </template>
        </el-table-column>
        <el-table-column
            label="清晰度"
            width="100"
        >
          <template scope="scope">
            <label>{{scope.row.quality.name}}</label>
          </template>
        </el-table-column>
        <el-table-column
            label="创建时间">
          <template scope="scope">
            <label>{{scope.row.startRecordTime.Format('yyyy-MM-dd HH:mm:ss')}}</label>
          </template>
        </el-table-column>
        <el-table-column
            label="终止时间">
          <template scope="scope">
            <label v-if="scope.row.stopRecordTime">{{scope.row.stopRecordTime.Format('yyyy-MM-dd HH:mm:ss')}}</label>
          </template>
        </el-table-column>
        <el-table-column
          label="时长">
          <template scope="scope">
            <label>{{getTimeRange(scope.row.startRecordTime, scope.row.stopRecordTime)}}</label>
          </template>
        </el-table-column>
        <el-table-column
            label="操作"
            width="250"
        >
          <template scope="scope">
            <el-button icon="el-icon-view" size="mini" @click="viewVideo(scope.row)"></el-button>
            <el-button icon="el-icon-folder" type="primary" size="mini" @click="showVideoFileInFolder(scope.row)"></el-button>
            <el-button icon="el-icon-s-flag" type="info" size="mini" @click="addTag(scope.row)"></el-button>
            <el-popconfirm
                :title="'确定删除此录制记录' + (globalSettings.deleteFileWhenDeleteHistory === true ? '和对应录制文件' : '') +'吗？'"
                @confirm="removeRecordHistory(scope.row._id)"
                :disabled="scope.row.status === 1"
            >
              <el-button slot="reference" size="mini" type="danger" icon="el-icon-delete" :disabled="scope.row.status === 1" style="margin-left: 5px"></el-button>
            </el-popconfirm>
          </template>
        </el-table-column>
        <el-empty slot="empty" :image-size="300"></el-empty>
      </el-table>
    </template>
    <template slot="footer">
      <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[100,200,500,1000,10000]"
          :total="total"
          @size-change="onSizeChange"
          @current-change="onPageChange"
          @prev-click="onPageChange"
          @next-click="onPageChange">
      </el-pagination>
    </template>
  </sub-page>
</template>

<script>
import SubPage from '../../SubPage'
import fs from 'fs'
import {getSettings} from '../../../config/settings'
export default {
  name: 'History',
  components: {SubPage},
  data () {
    return {
      globalSettings: {},
      tableData: [],
      recordId: null,
      record: null,
      multipleSelection: [],
      // 查询参数
      query: {
        keyword: null,
        status: ''
      },
      // 查询条件改变
      queryConditionChange: false,
      // 分页参数
      page: 1,
      pageSize: 100,
      total: 0,
      // 加载条
      tableDataLoading: true
    }
  },
  mounted () {
    // 获取设置
    getSettings().then(settings => {
      if (settings) {
        this.globalSettings = settings
      } else {
        this.globalSettings = this.$manager.recordManager.globalSettings
      }
      console.log({settings: this.globalSettings})
    }).catch(e => {
      console.log(e)
      this.$message.error('获取软件设置失败!')
      this.$router.back()
    })
  },
  watch: {
    query: {
      handler () {
        // 查询条件改变
        this.queryConditionChange = true
      },
      deep: true
    }
  },
  methods: {
    onQueryInputKeydown (event) {
      if (event.keyCode === 13) {
        // enter
        this.listRecordHistory()
      }
    },
    onRowHoverEnter (row, col, cell) {
      if (cell.cellIndex === 1) {
        // 显示标签
        this.$set(row, 'tagsShow', true)
      }
    },
    onPopoverHoverEnter (row) {
      this.$set(row, 'tagsShow', true)
    },
    onPageChange (cur) {
      this.page = cur
      this.$nextTick(_ => {
        // this.page === cur时不会触发
        this.listRecordHistory()
      })
    },
    onSizeChange (size) {
      // 返回第一页
      this.page = 1
      this.pageSize = size
      this.$nextTick(_ => {
        this.listRecordHistory()
      })
    },
    async listRecordHistory () {
      this.tableDataLoading = true
      try {
        // 保存当前vue对象
        const that = this
        const dbQuery = {
          recordId: this.record._id,
          $or: [
            {
              'file.name': {
                $regex: this.query.keyword ? new RegExp(this.query.keyword) : /.*/
              }
            },
            {
              $where: function () {
                const regexp = new RegExp(that.query.keyword)
                if (this.tags) {
                  for (let tag of this.tags) {
                    if (regexp.test(tag)) {
                      return true
                    }
                  }
                }
                return false
              }
            }
          ]
        }
        if (this.query.status != null && this.query.status !== '') {
          dbQuery.status = this.query.status
        }
        console.log({query: this.query})
        // 构造分页参数
        let page = this.queryConditionChange ? 1 : this.page
        if (page !== this.page) {
          // 触发页码改变
          this.page = page
        }
        let count = await this.$dbs.recordHistory._count_(dbQuery).catch(e => {
          if (e) {
            throw e
          }
        })
        if (count <= (page - 1) * this.pageSize) {
          console.log('此页数据为空返回上一页')
          page = page > 1 ? page - 1 : 1
          this.page = page
        }
        this.$dbs.recordHistory.$find(dbQuery).sort({startRecordTime: -1}).limit(this.pageSize).skip((page - 1) * this.pageSize).then((e, docs) => {
          if (e) {
            throw e
          } else {
            this.tableData = docs
            this.total = count
            this.tableDataLoading = false
            // 查询条件改变状态置为false
            this.queryConditionChange = false
            console.log(docs)
          }
        })
      } catch (e) {
        this.$message.error('获取录制记录失败')
        console.log(e)
        this.tableDataLoading = false
      }
    },
    getTimeRange (startTime, stopTime) {
      let timeIntervalString = ''
      if (!startTime || !stopTime || stopTime.getTime() - startTime.getTime() < 0) {
        return timeIntervalString
      }
      const timeInterval = stopTime.getTime() - startTime.getTime()
      const hours = Number.parseInt(timeInterval / 3600000)
      const millsOfHours = hours * 3600000
      const minutes = Number.parseInt((timeInterval - millsOfHours) / 60000)
      const millsOfMinutes = minutes * 60000
      const secconds = (timeInterval - millsOfHours - millsOfMinutes) / 1000
      if (hours > 0) {
        timeIntervalString = timeIntervalString + `${hours}时`
      }
      if (minutes > 0 || hours > 0) {
        timeIntervalString = timeIntervalString + `${minutes}分`
      }
      if (secconds >= 0) {
        timeIntervalString = timeIntervalString + `${secconds}秒`
      }
      return timeIntervalString
    },
    viewVideo (recordHistory) {
      const videoAbsolutePath = recordHistory.file.absolutePath
      if (!videoAbsolutePath || !fs.existsSync(videoAbsolutePath)) {
        this.$message.warning('录制文件不存在！')
        return
      }
      if (!this.$electron.shell.openExternal(videoAbsolutePath, {activate: true})) {
        this.$message.error('预览出错！')
      }
    },
    showVideoFileInFolder (recordHistory) {
      const videoAbsolutePath = recordHistory.file.absolutePath
      if (!videoAbsolutePath || !fs.existsSync(videoAbsolutePath)) {
        this.$message.warning('录制文件不存在！')
        return
      }
      this.$electron.shell.showItemInFolder(videoAbsolutePath)
    },
    openRecordHomeFolder () {
      const fullPath = this.$manager.recordManager.getRecordHomePath(this.record)
      if (!this.$electron.shell.openExternal(fullPath, {activate: true})) {
        this.$message.error('打开录制文件夹出错！')
      }
    },
    addTag (recordHistory) {
      if (recordHistory.tags && recordHistory.tags.length === 6) {
        this.$message.warning('最多添加6个标签')
        return
      }
      this.$prompt(null, '新增Tag', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\S+$/,
        inputErrorMessage: 'Tag内容不能包含空格'
      }).then(({ value }) => {
        if (recordHistory.tags && recordHistory.tags.indexOf(value.trim()) > -1) {
          this.$message.warning('已存在此Tag')
          return
        }
        this.$dbs.recordHistory._update_({_id: recordHistory._id}, {$push: {tags: value.trim()}}, {multi: false}).then(async num => {
          if (num > 0) {
            const rowIndex = this.getRowIndex(recordHistory._id)
            if (rowIndex > -1) {
              // 单行刷新
              const newRecordHistory = (await this.$dbs.recordHistory._find_({_id: recordHistory._id}))[0]
              this.tableData.splice(rowIndex, 1, newRecordHistory)
            } else {
              // 全部刷新
              await this.listRecordHistory()
            }
            this.$message.success('添加Tag成功')
          } else {
            this.$message.error('添加Tag失败')
          }
        })
      }).catch(() => {
        // 取消输入
      })
    },
    removeTag (id, tag) {
      this.$dbs.recordHistory._update_({_id: id}, {$pull: {tags: tag}}, {multi: false}).then(async num => {
        if (num > 0) {
          const rowIndex = this.getRowIndex(id)
          if (rowIndex > -1) {
            // 单行刷新
            const newRecordHistory = (await this.$dbs.recordHistory._find_({_id: id}))[0]
            this.tableData.splice(rowIndex, 1, newRecordHistory)
          } else {
            // 全部刷新
            await this.listRecordHistory()
          }
          this.$message.success('删除Tag成功')
        } else {
          this.$message.error('删除Tag失败')
        }
      })
    },
    getRowIndex (id) {
      // 获取_id 为id记录的数组下标
      let rowIndex = -1
      for (let i = 0; i < this.tableData.length; i++) {
        if (this.tableData[i]._id === id) {
          rowIndex = i
          break
        }
      }
      return rowIndex
    },
    async deleteFiles (recordHistories, force = false) {
      return new Promise((resolve, reject) => {
        if (!force) {
          // 全局启用删除录制记录同时删除录制文件设置才进行文件删除
          if (this.globalSettings.deleteFileWhenDeleteHistory == null) {
            // 询问
            this.$confirm(`是否删除对应文件？`, '提示', {
              confirmButtonText: '删除',
              cancelButtonText: '取消',
              type: 'warning'
            }).then(async _ => {
              await this.deleteFiles(recordHistories, true)
              resolve()
            }).catch(_ => {
              // 取消
              resolve()
            })
            return
          } else if (this.globalSettings.deleteFileWhenDeleteHistory === false) {
            // 不删除
            resolve()
            return
          }
          // 删除
        }
        if (!recordHistories) {
          resolve()
          return
        }
        for (let recordHistory of recordHistories) {
          const videoAbsolutePath = recordHistory.file.absolutePath
          if (!videoAbsolutePath || !fs.existsSync(videoAbsolutePath)) {
            continue
          }
          try {
            fs.unlinkSync(videoAbsolutePath)
          } catch (e) {
            console.log(`删除文件出错[${videoAbsolutePath}]`, e)
          }
        }
        this.$message.info('同时删除文件')
        resolve()
      })
    },
    handleSelectionChange (multipleSelection) {
      this.multipleSelection = multipleSelection
    },
    removeMultipleSelection () {
      this.$confirm(`此操作将移除已选择录制记录${this.globalSettings.deleteFileWhenDeleteHistory === true ? '和对应录制文件' : ''}, 是否继续?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async _ => {
        const ids = this.multipleSelection.map(item => item._id)
        const deleteRecordHistoryList = await this.$dbs.recordHistory._find_({_id: {$in: ids}})
        this.$dbs.recordHistory._remove_({_id: {$in: ids}}, {multi: true}).then(async _ => {
          // 删除文件
          await this.deleteFiles(deleteRecordHistoryList)
          await this.listRecordHistory()
          this.$message.success('删除成功')
        }).catch(e => {
          console.log(e)
          this.listRecordHistory()
          this.$message.error('删除失败')
        })
      }).catch(e => {
        // 取消
      })
    },
    removeAll () {
      this.$confirm(`此操作将移除所有录制记录${this.globalSettings.deleteFileWhenDeleteHistory ? '和对应录制文件' : ''}, 是否继续?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async _ => {
        const deleteRecordHistoryList = await this.$dbs.recordHistory._find_({recordId: this.recordId})
        this.$dbs.recordHistory._remove_({recordId: this.recordId}, {multi: true}).then(async _ => {
          // 删除文件
          await this.deleteFiles(deleteRecordHistoryList)
          await this.listRecordHistory()
          this.$message.success('删除成功')
        }).catch(e => {
          console.log(e)
          this.listRecordHistory()
          this.$message.error('删除失败')
        })
      }).catch(e => {
        // 取消
      })
    },
    async removeRecordHistory (id) {
      console.log('删除录制历史记录: ' + id)
      const deleteRecordHistoryList = await this.$dbs.recordHistory._find_({_id: id})
      this.$dbs.recordHistory._remove_({_id: id}).then(async _ => {
        // 删除文件
        await this.deleteFiles(deleteRecordHistoryList)
        const rowIndex = this.getRowIndex(id)
        if (rowIndex > -1) {
          // 单行刷新
          this.tableData.splice(rowIndex, 1)
        } else {
          // 全部刷新
          await this.listRecordHistory()
        }
        this.$message.success('删除成功')
      }).catch(e => {
        console.log(e)
        this.$message.error('删除失败')
      })
    }
  },
  beforeRouteEnter (to, from, next) {
    next(async vm => {
      try {
        vm.recordId = vm.$route.params.id
        vm.$refs.subPage.beforeRouteBack(() => {
          return {pageInfo: vm.$route.params.pageInfo}
        })
        const record = (await vm.$dbs.record._find_({_id: vm.$route.params.id}))[0]
        vm.record = record
        vm.listRecordHistory(record)
      } catch (e) {
        vm.$message.error('获取录制记录失败')
      }
    })
  }
}
</script>

<style scoped>
.el-pagination {
  width: 100%;
  text-align: right;
}
</style>
