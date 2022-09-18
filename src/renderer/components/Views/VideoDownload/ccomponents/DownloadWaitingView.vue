<template>
  <div style="height: 100%">
    <el-table :data="waitDownloadData" :show-header="false" max-height="560px" size="small">
      <el-table-column width="100">
        <template slot-scope="scope">
          <el-image v-if="scope.row.cover" :src="scope.row.cover" :preview-src-list="[scope.row.cover]" style="width: 72px;height: 54px"></el-image>
        </template>
      </el-table-column>
      <el-table-column width="500">
        <template slot-scope="scope">
          {{scope.row.title}}
        </template>
      </el-table-column>
      <el-table-column width="120">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.adapter.name" type="warning">{{scope.row.adapter ? scope.row.adapter.name : ''}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column width="120">
        <template slot-scope="scope">
          <label style="font-weight: bold; color: #10c7c7">{{scope.row.preferenceQuality ? scope.row.preferenceQuality.name : ''}}</label>
        </template>
      </el-table-column>
      <el-table-column width="120">
        <template slot-scope="scope">
          <el-button v-if="scope.row.status === 1" icon="el-icon-loading" size="mini">解析中..</el-button>
          <el-button v-else-if="scope.row.status === 2" icon="el-icon-loading" size="mini" type="primary">下载中..</el-button>
          <el-button v-else-if="scope.row.status === 3" size="mini" type="success">下载完成</el-button>
          <el-button v-else-if="scope.row.status === -1" size="mini" type="danger">下载错误</el-button>
          <el-button v-else-if="scope.row.status === 4" size="mini" type="info">已取消</el-button>
          <el-button v-else-if="scope.row.status === 5" size="mini" type="warning">意外终止</el-button>
        </template>
      </el-table-column>
      <el-table-column>
        <template slot-scope="scope">
          <el-button type="danger" size="mini" icon="el-icon-delete" @click="removeRecord(scope.row._id)"></el-button>
        </template>
      </el-table-column>
      <div slot="empty">
        <el-empty description="暂无待下载视频"></el-empty>
      </div>
    </el-table>
  </div>
</template>

<script>
export default {
  name: 'DownloadWaitingView',
  data () {
    return {
      waitDownloadData: []
    }
  },
  mounted () {
  },
  methods: {
    async addRow (id) {
      const docs = await (this.$dbs.downloadRecord._find_({_id: id}))
      if (docs) {
        const downloadRecord = docs[0]
        this.waitDownloadData.push(downloadRecord)
      }
    },
    async deleteRow (id) {
      for (let i = 0; i < this.waitDownloadData.length; i++) {
        if (this.waitDownloadData[i]._id === id) {
          // 移除
          this.waitDownloadData.splice(i, 1)
          return
        }
      }
    },
    async removeRecord (id) {
      await this.$dbs.downloadRecord._remove_({_id: id}, {multi: true})
      await this.deleteRow(id)
      this.$message.success('删除成功')
    },
    async refreshList () {
      this.waitDownloadData = await (this.$dbs.downloadRecord.$find_({status: 0}).sort({createTime: -1}).execute())
    },
    cancelDownload (id) {
      this.$manager.downloadManager.cancelDownload(id)
    },
    async refreshView () {
      await this.refreshList()
      // 设置下载监听器
      this.$manager.downloadManager.addDownloadChangeListener({
        parsing: async (id) => {
          await this.deleteRow(id)
        },
        failed: async (id, error) => {
          await this.deleteRow(id)
        },
        success: async (id) => {
          await this.deleteRow(id)
        },
        cancel: async (id) => {
          console.log(`取消下载${id}`)
          await this.deleteRow(id)
        }
      })
    }
  }
}
</script>

<style scoped>

</style>
