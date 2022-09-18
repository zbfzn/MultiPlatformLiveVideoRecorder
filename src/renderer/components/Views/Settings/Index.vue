<template>
  <common-page>
    <h1 slot="header">{{$route.meta.title}}</h1>
    <el-form slot="main" size="small" label-width="150px" label-position="left">
      <el-form-item>
        <label slot="label">
          自动检查(全局)
        </label>
        <el-switch v-model="globalSettings.enableAutoCheck"></el-switch>
      </el-form-item>
      <el-form-item>
        <label slot="label">
          输出文件夹(默认)
        </label>
        <input ref="folderSelect" type="file" @change="fileChange" webkitdirectory hidden></input>
        <el-input readonly v-model="globalSettings.defaultOuPutDir"></el-input>
        <el-button type="primary" size="small" @click="$refs.folderSelect.click()">选取</el-button>
        <el-tooltip v-if="!isDefaultOuPutDirApplyToAllRecords" effect="light" content="新增录制时生效" placement="right">
          <em class="el-icon-warning important-help"></em>
        </el-tooltip>
        <br/>
        <el-checkbox v-model="isDefaultOuPutDirApplyToAllRecords">输出文件夹应用到当前所有录制任务</el-checkbox>
      </el-form-item>
      <el-form-item>
        <label slot="label">
          录制历史删除
        </label>
        <el-select v-model="globalSettings.deleteFileWhenDeleteHistory">
          <el-option label="询问是否删除文件" :value="null"/>
          <el-option label="保留录制文件" :value="false"/>
          <el-option label="同时删除录制文件" :value="true"/>
        </el-select>
      </el-form-item>
      <el-form-item>
        <label slot="label">
          哔哩哔哩用户Cookie
        </label>
        <el-input v-model="globalSettings.biliBiliUserCookie" clearable></el-input>
        <el-tooltip effect="light" content="用于获取需要登录的才能获取到的高清晰度视频" placement="right">
          <em class="el-icon-warning important-help"></em>
        </el-tooltip>
      </el-form-item>
      <el-form-item
          prop="fileFormat">
        <label slot="label">
          录制视频输出格式
        </label>
        <el-select v-model="globalSettings.defaultRecordVideoOutputFormat">
          <el-option v-for="format in recordVideoOutputFormats" :key="format" :value="format" :label="format.toUpperCase()"/>
        </el-select>
      </el-form-item>
      <el-form-item label-width="0">
        <el-button type="success" @click="save">保存</el-button>
      </el-form-item>
    </el-form>
  </common-page>
</template>

<script>
import CommonPage from '../../CommonPage'
import {getSettings, saveSettings} from '../../../config/settings'
import LivePlatform from '../../../live-platform/live-platform'
export default {
  name: 'Index',
  components: {CommonPage},
  data () {
    return {
      globalSettings: {
        // 开启全局自动检查，false时录制任务自动检查不生效
        enableAutoCheck: true,
        // 默认输出文件路径，新增时生效
        defaultOuPutDir: null,
        // 删除录制历史时同时删除文件, null 为禁用全局设置
        deleteFileWhenDeleteHistory: null,
        // 哔哩哔哩用户Cookie，用于获取需要登录的才能获取到的高清晰度视频
        biliBiliUserCookie: null,
        // 录制视频文件输出默认格式（仅新增录播生效）
        defaultRecordVideoOutputFormat: null
      },
      // 保存进入页面时的设置，用于判断设置是否改变
      oldGlobalSettings: null,
      // 是否已保存设置
      isSave: true,
      // 默认输出文件夹是否应用到所有录制任务，默认false（不应用）
      isDefaultOuPutDirApplyToAllRecords: false,
      recordVideoOutputFormats: LivePlatform.supportVideoOutPutFormats ? Object.keys(LivePlatform.supportVideoOutPutFormats) : []
    }
  },
  watch: {
    globalSettings: {
      handler () {
        if (JSON.stringify(this.oldGlobalSettings) !== JSON.stringify(this.globalSettings)) {
          // 设置改变了就置为未保存
          this.isSave = false
        }
      },
      deep: true
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      getSettings().then(settings => {
        if (settings) {
          vm.globalSettings = settings
          // 不能直接赋值，因为是引用
          vm.oldGlobalSettings = {...settings}
        } else {
          vm.oldGlobalSettings = {...vm.globalSettings}
        }
      }).catch(e => {
        console.log(e)
        vm.$message.error('获取软件设置失败!')
        vm.$router.back()
      })
    })
  },
  beforeRouteLeave (to, from, next) {
    if (JSON.stringify(this.oldGlobalSettings) !== JSON.stringify(this.globalSettings) && !this.isSave) {
      // 设置改变了但没有保存
      this.$confirm('设置未保存，是否保存？', '提示', {
        confirmButtonText: '保存',
        cancelButtonText: '不保存',
        type: 'warning',
        // 区分取消、关闭
        distinguishCancelAndClose: true
      }).then(_ => {
        this.save(_ => {
          next()
        })
      }).catch(action => {
        // 取消才跳转，关闭不跳转
        if (action === 'cancel') {
          next()
        } else {
          next(false)
        }
      })
    } else {
      next()
    }
  },
  methods: {
    fileChange (event) {
      if (!event.target.files.length > 0 || !event.target.files[0]) {
        return
      }
      console.log(event.target.files[0].path)
      this.globalSettings.defaultOuPutDir = event.target.files[0].path
    },
    save (onSuccess) {
      const settings = {...this.globalSettings}
      delete settings._id
      saveSettings(settings).then(async _ => {
        this.$message.success('保存成功')
        // recordManager更新设置
        this.$manager.recordManager.setGlobalSettings(settings)
        // 保存成功后做的事
        await this.afterSaveSettingsSuccess()
        // 已保存
        this.isSave = true
        if (onSuccess && typeof onSuccess === 'function') {
          // 保存成功调用函数
          onSuccess()
        }
      }).catch(e => {
        this.$message.error('保存失败：' + e.message)
      })
    },
    afterSaveSettingsSuccess () {
      return new Promise(async (resolve, reject) => {
        if (this.isDefaultOuPutDirApplyToAllRecords && this.globalSettings.defaultOuPutDir) {
          await this.applyDefaultOutputDirToAllRecords()
        }
        resolve()
      })
    },
    applyDefaultOutputDirToAllRecords () {
      return new Promise(async (resolve, reject) => {
        // 输出文件夹应用到所有录制任务
        await this.$dbs.record._update_({}, {$set: {'settings.outPutDir': this.globalSettings.defaultOuPutDir}}, {multi: true})
        resolve()
      })
    }
  }
}
</script>

<style scoped>
.el-input {
  max-width: 50%;
}
label {
  font-weight: bold;
  color: black;
}
.el-form {
  margin-left: 30px;
}
</style>
