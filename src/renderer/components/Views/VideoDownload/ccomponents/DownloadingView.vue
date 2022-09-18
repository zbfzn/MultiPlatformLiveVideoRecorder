<template>
  <div style="height: 100%">
    <el-table :data="downloadingData" :show-header="false" max-height="560px" size="small">
      <el-table-column width="100">
        <template slot-scope="scope">
          <el-image v-if="scope.row.cover" :src="scope.row.cover" :preview-src-list="[scope.row.cover]" style="width: 72px;height: 54px"></el-image>
        </template>
      </el-table-column>
      <el-table-column width="600">
        <template slot-scope="scope">
          {{scope.row.title}}
        </template>
      </el-table-column>
      <el-table-column width="120">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.adapter && scope.row.adapter.name" type="warning">{{scope.row.adapter ? scope.row.adapter.name : ''}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column width="120">
        <template slot-scope="scope">
          <label style="font-weight: bold; color: #10c7c7">{{scope.row.quality ? scope.row.quality.name : ''}}</label>
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
      <el-table-column width="250">
        <template slot-scope="scope">
          <el-progress :percentage="scope.row.progress * 100" :format="progress => `${Number(/(\d+(\.\d{0,2})?)/.exec(String(progress))[1])}%`" :color="customColorMethod"></el-progress>
        </template>
      </el-table-column>
      <el-table-column>
        <template slot-scope="scope">
          <el-button v-if="scope.row.status === 2" type="danger" size="mini" icon="el-icon-circle-close" @click="cancelDownload(scope.row._id)"></el-button>
        </template>
      </el-table-column>
      <div slot="empty">
        <el-empty description="暂无下载中视频"></el-empty>
      </div>
    </el-table>
  </div>
</template>

<script>
export default {
  name: 'DownloadingView',
  data () {
    return {
      downloadingData: [
        // {
        //   title: '【恩七不甜】芦荟胶环绕音芦荟胶',
        //   cover: 'https://i1.hdslb.com/bfs/archive/fc1b13e5e148e81f3e924196050aa482fa69cf84.jpg@640w_400h_1c.webp',
        //   progress: 0,
        //   status: 1
        // },
        // {
        //   title: '【恩七不甜】芦荟胶环绕音芦荟胶',
        //   cover: 'https://i1.hdslb.com/bfs/archive/fc1b13e5e148e81f3e924196050aa482fa69cf84.jpg@640w_400h_1c.webp',
        //   progress: 0.1,
        //   qualityName: '高清1080P60',
        //   status: 2
        // },
        // {
        //   title: '【恩七不甜】芦荟胶环绕音芦荟胶',
        //   cover: 'https://i1.hdslb.com/bfs/archive/fc1b13e5e148e81f3e924196050aa482fa69cf84.jpg@640w_400h_1c.webp',
        //   progress: 0.3,
        //   status: 2
        // },
        // {
        //   title: '【恩七不甜】芦荟胶环绕音芦荟胶',
        //   cover: 'https://i1.hdslb.com/bfs/archive/fc1b13e5e148e81f3e924196050aa482fa69cf84.jpg@640w_400h_1c.webp',
        //   progress: 0.5,
        //   status: 2
        // },
        // {
        //   title: '【恩七不甜】芦荟胶环绕音芦荟胶',
        //   cover: 'https://i1.hdslb.com/bfs/archive/fc1b13e5e148e81f3e924196050aa482fa69cf84.jpg@640w_400h_1c.webp',
        //   progress: 0.8,
        //   status: 2
        // },
        // {
        //   title: '【恩七不甜】芦荟胶环绕音芦荟胶',
        //   cover: 'https://i1.hdslb.com/bfs/archive/fc1b13e5e148e81f3e924196050aa482fa69cf84.jpg@640w_400h_1c.webp',
        //   progress: 1,
        //   status: 3
        // },
        // {
        //   title: '【恩七不甜】芦荟胶环绕音芦荟胶',
        //   cover: 'https://i1.hdslb.com/bfs/archive/fc1b13e5e148e81f3e924196050aa482fa69cf84.jpg@640w_400h_1c.webp',
        //   progress: 0.8,
        //   status: 2
        // },
        // {
        //   title: '【恩七不甜】芦荟胶环绕音芦荟胶',
        //   cover: 'https://i1.hdslb.com/bfs/archive/fc1b13e5e148e81f3e924196050aa482fa69cf84.jpg@640w_400h_1c.webp',
        //   progress: 1,
        //   status: 3
        // }
      ]
    }
  },
  watch: {
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
    async updateRow (id) {
      const docs = await (this.$dbs.downloadRecord._find_({_id: id}))
      if (docs) {
        const downloadRecord = docs[0]
        for (let i = 0; i < this.downloadingData.length; i++) {
          if (this.downloadingData[i]._id === id) {
            // 更新状态
            const tmp = this.downloadingData[i]
            tmp.status = downloadRecord.status
            tmp.quality = downloadRecord.quality
            tmp.url = downloadRecord.url
            tmp.progress = downloadRecord.progress
            this.$set(this.downloadingData, i, tmp)
            return
          }
        }
        // 不存在，加入
        this.downloadingData.push(downloadRecord)
      }
    },
    async deleteRow (id) {
      for (let i = 0; i < this.downloadingData.length; i++) {
        if (this.downloadingData[i]._id === id) {
          // 移除
          this.downloadingData.splice(i, 1)
          return
        }
      }
    },
    cancelDownload (id) {
      this.$manager.downloadManager.cancelDownload(id)
    },
    async refreshList () {
      this.downloadingData = await (this.$dbs.downloadRecord.$find_({status: {$in: [1, 2]}}).sort({startDownloadTime: 1}).execute())
    },
    async refreshView () {
      await this.refreshList()
      // 设置下载监听器
      this.$manager.downloadManager.addDownloadChangeListener({
        parsing: async (id) => {
          console.log(`解析：${id}`)
          const docs = await (this.$dbs.downloadRecord._find_({_id: id}))
          if (docs) {
            const downloadRecord = docs[0]
            this.downloadingData.push(downloadRecord)
          }
        },
        downloading: async (id) => {
          console.log(`开始下载：${id}`)
          await this.updateRow(id)
        },
        progressing: async (id, progress) => {
          console.log(`${id} 进度 ${progress * 100}%`)
          await this.updateRow(id)
        },
        failed: async (id, error) => {
          console.log(`${id}下载失败：${error.message}`)
          await this.deleteRow(id)
        },
        success: async (id) => {
          console.log(`${id}下载成功`)
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
