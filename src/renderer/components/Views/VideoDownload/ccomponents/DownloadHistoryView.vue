<template>
  <div style="height: 100%">
    <div style="display:inline;border: #f1f1f1 solid 1px; border-radius: 5px; margin-right: 10px;right: 10px;padding: 11px 8px 12px 8px;">
      <!-- 搜索框 -->
      <el-input v-model="query.keyword" style="width: 200px;" size="mini" clearable placeholder="文件名" @keydown.native="event => event.keyCode === 13 && search()"></el-input>
      <el-select v-model="query.status" size="mini" clearable placeholder="请选择下载状态">
        <el-option label="全部" :value="''"></el-option>
        <el-option label="下载错误" :value="-1"></el-option>
        <el-option label="下载完成" :value="3"></el-option>
        <el-option label="已取消" :value="4"></el-option>
        <el-option label="意外终止" :value="5"></el-option>
      </el-select>
      <el-button icon="el-icon-search" size="mini" type="primary" @click="search">搜索</el-button>
      <el-button v-if="newAddedCount > 0" type="success" size="mini" icon="el-icon-refresh" @click="refreshView(true)">刷新</el-button>
    </div>
    <el-table :data="finishedData" :show-header="false" max-height="560px" size="small">
      <el-table-column width="100">
        <template slot-scope="scope">
          <el-image v-if="scope.row.cover" :src="scope.row.cover" :preview-src-list="[scope.row.cover]" style="width: 72px;height: 54px"></el-image>
        </template>
      </el-table-column>
      <el-table-column width="450">
        <template slot-scope="scope">
          {{scope.row.title}}
        </template>
      </el-table-column>
      <el-table-column width="100">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.adapter.name" type="warning">{{scope.row.adapter ? scope.row.adapter.name : ''}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column width="120" align="center">
        <template slot-scope="scope">
          <label style="font-weight: bold; color: #10c7c7">{{scope.row.quality ? scope.row.quality.name : ''}}</label>
        </template>
      </el-table-column>
      <el-table-column width="120" align="center">
        <template slot-scope="scope">
          <el-button v-if="scope.row.status === 1" icon="el-icon-loading" size="mini">解析中..</el-button>
          <el-button v-else-if="scope.row.status === 2" icon="el-icon-loading" size="mini" type="primary">下载中..</el-button>
          <el-button v-else-if="scope.row.status === 3" size="mini" type="success">下载完成</el-button>
          <el-tooltip v-else-if="scope.row.status === -1" :content="scope.row.errorMsg">
            <el-button size="mini" type="danger">下载错误</el-button>
          </el-tooltip>
          <el-button v-else-if="scope.row.status === 4" size="mini" type="info">已取消</el-button>
          <el-button v-else-if="scope.row.status === 5" size="mini" type="warning">意外终止</el-button>
        </template>
      </el-table-column>
      <el-table-column width="250">
        <template slot-scope="scope">
          <el-progress :percentage="scope.row.progress * 100" :format="progress => `${Number(/(\d+(\.\d{0,2})?)/.exec(String(progress))[1])}%`" :color="customColorMethod"></el-progress>
        </template>
      </el-table-column>
      <el-table-column>
        <template slot-scope="scope">
          <el-button v-if="scope.row.status === 3" icon="el-icon-view" size="mini" @click="viewVideo(scope.row)"></el-button>
          <el-button v-else icon="el-icon-refresh" size="mini" @click="retry(scope.row)"></el-button>
          <el-button icon="el-icon-folder" type="primary" size="mini" @click="showVideoFileInFolder(scope.row)"></el-button>
          <el-popconfirm
              :title="'确定删除此下载记录吗？'"
              @confirm="removeRecord(scope.row, false)"
          >
            <el-button slot="reference" size="mini" type="danger" icon="el-icon-delete" style="margin-left: 5px"></el-button>
          </el-popconfirm>
          <el-popconfirm
              :title="'确定删除此下载记录及文件吗？'"
              @confirm="removeRecord(scope.row, true)"
          >
            <el-button slot="reference" size="mini" type="danger" icon="el-icon-document-delete" style="margin-left: 5px"></el-button>
          </el-popconfirm>
        </template>
      </el-table-column>
      <div slot="empty">
        <el-empty description="暂无已下载完成视频"></el-empty>
      </div>
    </el-table>
  </div>
</template>

<script>
import fs from 'fs'

export default {
  name: 'DownloadHistoryView',
  data () {
    return {
      finishedData: [
        // {
        //   title: '【恩七不甜】芦荟胶环绕音芦荟胶',
        //   cover: 'https://i1.hdslb.com/bfs/archive/fc1b13e5e148e81f3e924196050aa482fa69cf84.jpg@640w_400h_1c.webp',
        //   progress: 0.1,
        //   quality: {
        //     name: '高清1080P60'
        //   },
        //   status: 2
        // }
      ],
      query: {
        keyword: '',
        status: ''
      },
      resetPage: false,
      // 记录查询条件改变时间，更新此值才会显示新增数据。如：正在浏览历史，浏览期间有下载完成或出错记录，只有更新此值后才能刷新新增数据
      queryConditionChangeTime: new Date(),
      newAddedCount: 0
    }
  },
  props: {
    pageData: {
      require: true,
      default () {
        return {
          page: 1,
          total: 0,
          pageSize: 7
        }
      }
    }
  },
  model: {
    prop: 'pageData',
    event: 'change'
  },
  watch: {
    query: {
      handler () {
        this.queryConditionChangeTime = new Date()
        // 重置分页数据
        this.resetCurrentPage()
      },
      deep: true
    }
  },
  mounted () {
  },
  methods: {
    customColorMethod (percentage) {
      if (percentage < 30) {
        return '#909399'
      } else if (percentage < 70) {
        return '#e6a23c'
      } else if (percentage < 99) {
        return '#c2d92f'
      } else {
        return '#67c23a'
      }
    },
    resetCurrentPage () {
      this.queryConditionChangeTime = new Date()
      this.resetPage = true
    },
    async addRow (id) {
      const docs = await (this.$dbs.downloadRecord._find_({_id: id}))
      if (docs) {
        const downloadRecord = docs[0]
        this.finishedData.push(downloadRecord)
      }
    },
    async deleteRow (id) {
      for (let i = 0; i < this.finishedData.length; i++) {
        if (this.finishedData[i]._id === id) {
          // 移除
          this.finishedData.splice(i, 1)
          return
        }
      }
    },
    async removeRecord (downloadRecord, deleteFile) {
      await this.$dbs.downloadRecord._remove_({_id: downloadRecord._id}, {multi: true})
      // await this.deleteRow(downloadRecord._id)
      if (deleteFile) {
        const videoAbsolutePath = downloadRecord.filePath
        if (videoAbsolutePath && fs.existsSync(videoAbsolutePath)) {
          try {
            fs.unlinkSync(videoAbsolutePath)
          } catch (e) {
            console.log(`删除文件出错[${videoAbsolutePath}]`, e)
          }
        }
      }
      this.$message.success('删除成功')
      await this.refreshList()
    },
    async retry (downloadRecord) {
      // 重试
      await this.$dbs.downloadRecord._update_({_id: downloadRecord._id}, {
        $set: {
          downloadFinishedTime: this.queryConditionChangeTime.setSeconds(this.queryConditionChangeTime.getSeconds() - 1),
          status: 0,
          startDownloadTime: this.queryConditionChangeTime.setSeconds(this.queryConditionChangeTime.getSeconds() - 1)
        }
      }, {multi: true})
      await this.deleteRow(downloadRecord._id)
      await this.refreshList()
    },
    async search () {
      this.queryConditionChangeTime = new Date()
      // 刷新
      await this.refreshList()
    },
    async refreshList () {
      if (this.resetPage) {
        this.newAddedCount = 0
      }
      const page = this.resetPage ? 1 : this.pageData.page
      const query = {
        $not: {
          status: {
            $in: [0, 1, 2]
          }
        },
        title: {
          $regex: this.query.keyword ? new RegExp(this.query.keyword) : /.*/
        },
        status: {
          $in: this.query.status ? [this.query.status] : [3, 4, 5, -1]
        },
        downloadFinishedTime: {
          $lte: this.queryConditionChangeTime
        }
      }
      const nowTotal = await (this.$dbs.downloadRecord._count_(query))
      let skip = 0
      // 当前总数小于等于偏移数，说明当前页无数据，返回上一页
      if (nowTotal <= (page - 1) * this.pageData.pageSize) {
        skip = (page - 2) * this.pageData.pageSize
      } else {
        skip = (page - 1) * this.pageData.pageSize
      }
      this.finishedData = await (this.$dbs.downloadRecord.$find_(query).skip(skip).sort({downloadFinishedTime: -1}).limit(this.pageData.pageSize).execute())
      this.$emit('change', {...this.pageData, page, total: nowTotal})
      this.resetPage = false
    },
    async refreshView (forceRefresh = true) {
      if (forceRefresh) {
        // 重置查询条件
        this.query = {
          keyword: '',
          status: ''
        }
        // 切换tab，重置分页
        this.resetCurrentPage()
      }
      await this.refreshList()
      // 设置下载监听器
      this.$manager.downloadManager.addDownloadChangeListener({
        failed: async (id, error) => {
          console.log(`${id}下载失败：${error.message}`)
          this.newAddedCount += 1
        },
        success: async (id) => {
          console.log(`${id}下载成功`)
          this.newAddedCount += 1
        },
        cancel: async (id) => {
          console.log(`取消下载${id}`)
          this.newAddedCount += 1
        }
      })
    },
    viewVideo (downloadReccord) {
      const videoAbsolutePath = downloadReccord.filePath
      if (!videoAbsolutePath || !fs.existsSync(videoAbsolutePath)) {
        this.$message.warning('录制文件不存在！')
        return
      }
      if (!this.$electron.shell.openExternal(videoAbsolutePath, {activate: true})) {
        this.$message.error('预览出错！')
      }
    },
    showVideoFileInFolder (downloadReccord) {
      const videoAbsolutePath = downloadReccord.filePath
      if (!videoAbsolutePath || !fs.existsSync(videoAbsolutePath)) {
        this.$message.warning('录制文件不存在！')
        return
      }
      this.$electron.shell.showItemInFolder(videoAbsolutePath)
    }
  }
}
</script>

<style scoped>

</style>
