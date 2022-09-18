<template>
  <sub-page :card-body-style="{height: '100%',padding: 0}">
    <div slot="main" style="height: 100%;">
      <el-tabs type="card" v-model="tabActiveName" active-name="downloading" style="padding-left: 0;padding-top: 0;height: 100%;overflow-y: hidden">
        <el-tab-pane label="下载中" name="downloading">
          <span slot="label"><em class="el-icon-download"></em>下载中</span>
          <downloading-view ref="viewDownloading" />
        </el-tab-pane>
        <el-tab-pane label="等待队列" name="waiting">
          <span slot="label"><em class="el-icon-tickets"></em>等待队列</span>
          <download-waiting-view ref="viewWaiting"/>
        </el-tab-pane>
        <el-tab-pane ref="tabHistory" label="下载记录" name="history">
          <span slot="label"><em class="el-icon-finished"></em>下载记录</span>
          <download-history-view ref="viewHistory" v-model="historyPageData"/>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template slot="footer">
      <el-pagination
          v-if="tabActiveName === 'history'"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :current-page="historyPageData.page"
          :page-size="historyPageData.pageSize"
          :page-sizes="[7, 10, 20, 50, 100,200,500]"
          :total="historyPageData.total"
          @size-change="onSizeChange"
          @current-change="onPageChange"
          @prev-click="onPageChange"
          @next-click="onPageChange"
      >
      </el-pagination>
    </template>
  </sub-page>
</template>

<script>
import SubPage from '../../SubPage'
import DownloadingView from './ccomponents/DownloadingView'
import DownloadWaitingView from './ccomponents/DownloadWaitingView'
import DownloadHistoryView from './ccomponents/DownloadHistoryView'
export default {
  name: 'DownloadManager',
  components: {DownloadHistoryView, DownloadWaitingView, DownloadingView, SubPage},
  data () {
    return {
      tabActiveName: 'downloading',
      historyPageData: {
        page: 1,
        total: 0,
        pageSize: 7
      }
    }
  },
  watch: {
    tabActiveName (nVal) {
      try {
        switch (nVal) {
          case 'downloading':
            this.$refs.viewDownloading.refreshView()
            break
          case 'waiting':
            this.$nextTick(() => {
              this.$refs.viewWaiting.refreshView()
            })
            break
          case 'history':
            this.$refs.viewHistory.refreshView()
            break
        }
      } catch (e) {
        console.log(e)
      }
    },
    historyPageData: {
      handler () {
        // nothing to do
      },
      deep: true
    }
  },
  mounted () {
    try {
      // 手动刷新一次
      this.$refs.viewDownloading.refreshView()
    } catch (e) {
      console.log(e)
    }
  },
  methods: {
    onPageChange (cur) {
      this.historyPageData.page = cur
      this.$nextTick(_ => {
        this.$refs.viewHistory.refreshView(false)
      })
    },
    onSizeChange (size) {
      this.historyPageData.page = 1
      this.historyPageData.pageSize = size
      this.$nextTick(_ => {
        this.$refs.viewHistory.refreshView()
      })
    }
  }
}
</script>

<style scoped>
.el-pagination {
  width: 100%;
  text-align: right;
}
</style>
