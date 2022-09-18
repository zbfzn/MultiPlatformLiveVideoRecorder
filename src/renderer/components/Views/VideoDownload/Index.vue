<template>
  <common-page :card-loading="videosLoading">
    <h1 slot="header">{{ $route.meta.title }}</h1>
    <div slot="main" style="height: 100%;">
      <el-input v-model="url" size="large" placeholder="请输入对应平台链接" class="download-url-input" @keydown.native="(event) => event.keyCode === 13 && parseUrlForVideos()" clearable>
        <el-select v-model="adapter" class="el-input-pre-select" slot="prepend" placeholder="请选择"
                   @change="adapterChange">
          <el-option v-for="adpt in adapters" :label="adpt.info.name" :value="adpt" :key="adpt.info.code"></el-option>
        </el-select>
        <el-button slot="append" icon="el-icon-search" @click="parseUrlForVideos"></el-button>
      </el-input>
      <div style="width: 100%;margin-top: 10px;font-size: 13px;">
        <span style="font-weight: bold">视频数：</span><span style="color: red; font-size: 14px;">{{ imgList.length }}</span>
        <el-button v-if="selection.length > 0 && selection.length === imgList.length" size="mini" type="primary" @click="selectAll(false)" :disabled="!imgList || imgList.length === 0" style="margin-left: 20px;padding: 3px;">取消全选</el-button>
        <el-button v-else size="mini" type="primary" @click="selectAll(true)" :disabled="!imgList || imgList.length === 0" style="margin-left: 20px;padding: 3px;">全选</el-button>
      </div>
      <!--      视频列表-->
      <image-list v-if="imgList && imgList.length > 0" ref="imageList" :img-data="imgList" @selection-change="onSelectionChange" show-index></image-list>
      <el-empty v-else></el-empty>
      <el-backtop target="div.el-card"></el-backtop>
      <el-dialog ref="preDownloadDialog" append-to-body :visible="preDownloadDialogVisible" title="下载设置" :show-close="false">
        <el-form label-position="right" label-width="120px">
          <el-form-item>
            <label slot="label">平台：</label>
            <span style="color: #409EFF;font-weight: bold">{{ (preDownloadDialogData.adapter && preDownloadDialogData.adapter.info ? preDownloadDialogData.adapter.info.name : '') }}</span>
          </el-form-item>
          <el-form-item>
            <label slot="label">清晰度：</label>
            <el-select v-model="preDownloadDialogData.preferenceQuality" class="el-input-pre-select"  placeholder="请选择" style="width: 180px;">
              <el-option v-for="quality in adapter.defaultConfig.qualities" :label="quality.name" :value="quality" :key="quality.code"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <label slot="label">
              格式：
            </label>
            <el-select v-model="preDownloadDialogData.fileFormat">
              <el-option v-for="format in preDownloadDialogData.fileFormats" :key="format" :value="format" :label="format.toUpperCase()"/>
            </el-select>
          </el-form-item>
          <el-form-item>
            <label slot="label">下载文件夹：</label>
            <input ref="folderSelect" type="file" @change="fileChange" webkitdirectory hidden></input>
            <el-input readonly v-model="preDownloadDialogData.downloadFolder" style="width: 60%"></el-input>
            <el-button type="primary" size="small" @click="() => {/*先清除上次选择的目录*/$refs.folderSelect.value = null;$refs.folderSelect.click()}">选取</el-button>
          </el-form-item>
        </el-form>
        <div slot="footer">
          <el-button @click="dialogCancel">取消</el-button>
          <el-button type="primary" @click="dialogSubmit" icon="el-icon-plus">加入下载队列</el-button>
        </div>
      </el-dialog>
    </div>
    <div slot="footer" style="width: 100%; text-align: start;margin-right: 50px;">
      <el-badge :value="!selection ? 0 : selection.length" style="margin-right: 20px;margin-bottom: 3px;">
        <el-button type="success" @click="preDownloadSelection" :disabled="!selection || selection.length === 0" icon="el-icon-download">下载已选择</el-button>
      </el-badge>
      <el-button @click="openDownloadManager" style="margin-top: 2px;margin-bottom: 2px" icon="el-icon-s-operation">下载管理</el-button>
    </div>
  </common-page>
</template>

<script>
import CommonPage from '../../CommonPage'
import ImageList from '../../ImageList'
// import BiliBiliVideoDownloadAdapter from '../../../video-download-adapter/BiliBiliVideoDownloadAdapter'
import DownloadAdapter from '../../../video-download-adapter'

export default {
  name: 'VideoDownload',
  components: {ImageList, CommonPage},
  mounted () {
    // 设置下载监听器
    this.$manager.downloadManager.addDownloadChangeListener({
      parsing (id) {
        console.log(`解析：${id}`)
      },
      downloading (id) {
        console.log(`开始下载：${id}`)
      },
      progressing (id, progress) {
        console.log(`${id} 进度 ${/(\d+(.\d{1,2}))/.exec(String(progress * 100))[1]}%`)
      },
      failed (id, error) {
        console.log(`${id}下载失败：${error.message}`)
      },
      success (id) {
        console.log(`${id}下载成功`)
      }
    })
  },
  data () {
    return {
      adapter: DownloadAdapter.adapters[0],
      imgList: [],
      adapters: DownloadAdapter.adapters,
      videosLoading: false,
      selection: [],
      url: '',
      preDownloadDialogVisible: false,
      fileFormats: DownloadAdapter.adapters[0].supportVideoOutPutFormats ? Object.keys(DownloadAdapter.adapters[0].supportVideoOutPutFormats) : [],
      preDownloadDialogData: {
        adapter: {},
        preferenceQuality: {},
        downloadFolder: '',
        fileFormat: 'FLV',
        videoDetails: [],
        fileFormats: []
      }
    }
  },
  watch: {
    url (nVal) {
      if (!nVal) {
        // 清除url
        this.reset()
      }
    },
    preDownloadDialogData: {
      handler () {
        // ignore
      },
      deep: true
    }
  },
  methods: {
    async parseUrlForVideos () {
      if (!this.url) {
        this.$message.warning(`请输入${this.adapter.info.name}视频或主页链接`)
        return
      }
      try {
        this.videosLoading = true
        const Adapter = this.adapter
        let videoDetailList = await (new Adapter().getVideoDetails(this.url))
        console.log('视频信息：', videoDetailList)
        const imgList = []
        for (let detail of videoDetailList) {
          imgList.push({
            id: detail.id,
            imgUrl: detail.cover,
            title: detail.title,
            data: detail
          })
        }
        this.imgList = imgList
      } catch (e) {
        console.log(e)
        this.$message.error('获取视频列表信息错误！')
      } finally {
        this.videosLoading = false
      }
    },
    adapterChange (adapter) {
      this.preDownloadDialogData.preferenceQuality = adapter.defaultConfig.qualities[adapter.defaultConfig.qualities.length - 1]
      this.fileFormats = adapter.supportVideoOutPutFormats ? Object.keys(adapter.supportVideoOutPutFormats) : []
      this.reset()
    },
    fileChange (event) {
      if (!event.target.files.length > 0 || !event.target.files[0]) {
        return
      }
      console.log(event.target.files[0].path)
      this.preDownloadDialogData.downloadFolder = event.target.files[0].path
    },
    reset () {
      this.selection = []
      this.imgList = []
      this.url = ''
    },
    selectAll (trigger = true) {
      this.$nextTick(() => {
        if (trigger) {
          this.$refs.imageList && this.$refs.imageList.selectAll()
        } else {
          // 取消全选
          this.$refs.imageList && this.$refs.imageList.clearSelection()
        }
      })
    },
    onSelectionChange (selection) {
      console.log('选中列表：', selection)
      this.selection = selection
    },
    preDownloadSelection () {
      const videoDetails = this.selection.map(item => {
        return {...item.data}
      })
      this.preDownloadDialogData = {
        adapter: this.adapter,
        preferenceQuality: this.adapter.defaultConfig.qualities[this.adapter.defaultConfig.qualities.length - 1],
        downloadFolder: '',
        fileFormat: this.fileFormats[0],
        videoDetails: videoDetails,
        fileFormats: this.fileFormats
      }
      this.preDownloadDialogVisible = true
    },
    dialogCancel () {
      this.preDownloadDialogVisible = false
    },
    async dialogSubmit () {
      if (!this.preDownloadDialogData.downloadFolder) {
        this.$message.warning('请选择下载文件夹！')
        return
      }
      await this.$manager.downloadManager.addDownloadTask(this.preDownloadDialogData.adapter.info, this.preDownloadDialogData.preferenceQuality, this.preDownloadDialogData.downloadFolder, this.preDownloadDialogData.fileFormat, this.preDownloadDialogData.videoDetails)
      this.$refs.imageList.clearSelection()
      this.preDownloadDialogVisible = false
    },
    openDownloadManager () {
      // 跳转下载管理
      this.$routeTo('download-manager', 'DownloadManager', {})
    }
  }
}
</script>

<style scoped>
.download-url-input {
  width: 70%;
  position: relative;
  left: 12%;
  padding: 0
}

.el-input-pre-select {
  width: 120px;
}

label {
  font-weight: bold;
}
</style>
