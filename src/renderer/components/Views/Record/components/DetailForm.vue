<template>
  <el-form
      :model="record"
      :rules="formRules"
      ref="recordForm"
      label-position="left"
      label-width="100px"
      size="mini">
    <el-form-item
        prop="platform">
      <label slot="label">
        直播平台
      </label>
      <el-select v-model="record.platform" :disabled="!record.platform || edit">
        <el-option v-for="livePlatform in livePlatforms" :key="livePlatform.platformInfo.code" :label="livePlatform.platformInfo.name" :value="livePlatform"/>
      </el-select>
    </el-form-item>
    <el-form-item
        prop="website">
      <label slot="label">
        平台地址
      </label>
      <el-input :value="record.website" disabled/>
    </el-form-item>
    <el-form-item
        prop="idOrUrl">
      <label slot="label">
        ID
      </label>
      <el-input v-model="record.idOrUrl" :disabled="!record.platform || edit" @blur="getUserInfo" :placeholder="getIdInputPlaceholder"/>
    </el-form-item>
    <el-form-item
        prop="userName">
      <label slot="label">
        昵称
      </label>
      <el-input v-model="record.userName" :disabled="!record.platform || edit"/>
      <el-tooltip effect="light" content="昵称保存后不可修改！" placement="right">
        <em class="el-icon-warning important-help"></em>
      </el-tooltip>
    </el-form-item>
    <el-form-item
        prop="channel">
      <label slot="label">
        线路
      </label>
      <el-select v-model="record.channel" value-key="code">
        <el-option v-for="channel in record.platform ? record.platform.defaultConfig.channels : []" :key="channel.code" :label="channel.name" :value="channel"/>
      </el-select>
    </el-form-item>
    <el-form-item
        prop="quality">
      <label slot="label">
        清晰度
      </label>
      <el-select v-model="record.quality" value-key="code">
        <el-option v-for="quality in record.platform ? record.platform.defaultConfig.qualities : []" :key="quality.code" :label="quality.name" :value="quality"/>
      </el-select>
    </el-form-item>
    <el-form-item
      prop="autoCheck">
      <label slot="label">
        自动检查
      </label>
      <el-switch v-model="record.autoCheck"></el-switch>
    </el-form-item>
    <el-form-item
        v-if="record.autoCheck"
        prop="checkWindow">
      <label slot="label">
        检查窗口
      </label>
      <el-select v-model="record.checkWindow">
        <el-option label="5秒" :value="5"></el-option>
        <el-option label="10秒" :value="10"></el-option>
        <el-option label="15秒" :value="15"></el-option>
        <el-option label="20秒" :value="20"></el-option>
        <el-option label="30秒" :value="30"></el-option>
        <el-option label="1分钟" :value="60"></el-option>
        <el-option label="2分钟" :value="120"></el-option>
        <el-option label="5分钟" :value="300"></el-option>
        <el-option label="10分钟" :value="600"></el-option>
        <el-option label="30分钟" :value="1800"></el-option>
        <el-option label="1小时" :value="3600"></el-option>
        <el-option label="2小时" :value="7200"></el-option>
        <el-option label="4小时" :value="14400"></el-option>
      </el-select>
    </el-form-item>
    <el-form-item
        prop="autoFragment">
      <label slot="label">
        自动分片
      </label>
      <el-switch v-model="record.autoFragment"></el-switch>
    </el-form-item>
    <el-form-item
        v-if="record.autoFragment"
        prop="fragmentLength">
      <label slot="label">
        分片时长
      </label>
      <el-select v-model="record.fragmentLength">
        <el-option label="30分钟" :value="1800"></el-option>
        <el-option label="1小时" :value="3600"></el-option>
        <el-option label="1小时30分钟" :value="4800"></el-option>
        <el-option label="2小时" :value="6400"></el-option>
      </el-select>
    </el-form-item>
    <el-form-item
      prop="fileFormat">
      <label slot="label">
        格式
      </label>
      <el-select v-model="record.fileFormat">
        <el-option v-for="format in fileFormats" :key="format" :value="format" :label="format.toUpperCase()"/>
      </el-select>
    </el-form-item>
    <el-form-item
      prop="outPutDir">
      <label slot="label">
        输出文件夹
      </label>
      <input ref="folderSelect" type="file" @change="fileChange" webkitdirectory hidden></input>
      <el-input readonly v-model="record.outPutDir"></el-input>
      <el-button type="primary" size="small" @click="$refs.folderSelect.click()">选取</el-button>
    </el-form-item>
    <el-form-item>
      <el-button type="success" @click.native="save">保存</el-button>
    </el-form-item>
  </el-form>
</template>

<script>
import livePlatform from '../../../../live-platform/index'
import {getSettings} from '../../../../config/settings'
export default {
  name: 'DetailForm',
  props: {
    edit: {
      type: Boolean,
      default: false
    },
    recordId: {
      type: [Number, String]
    },
    subPage: {
      type: Object
    }
  },
  mounted () {
    this.record.platform = livePlatform.platforms[0]
    // 获取设置
    getSettings().then(settings => {
      if (settings) {
        this.globalSettings = settings
      } else {
        this.globalSettings = this.$manager.recordManager.globalSettings
      }
      if (this.globalSettings.defaultRecordVideoOutputFormat) {
        this.record.fileFormat = this.globalSettings.defaultRecordVideoOutputFormat
      }
      console.log({settings: this.globalSettings})
    }).catch(e => {
      console.log(e)
      this.$message.error('获取软件设置失败!')
      this.$router.back()
    })
  },
  data () {
    let checkWindowValidator = (rule, value, callback) => {
      if (this.record.autoCheck && Number(this.record.checkWindow) < 10) {
        callback((new Error('检查窗口时间不能为空，且最小10秒')))
      } else {
        // 必须调用
        callback()
      }
    }
    return {
      record: {
        platform: null,
        website: null,
        channel: null,
        quality: null,
        idOrUrl: null,
        userName: null,
        autoCheck: false,
        checkWindow: 10,
        outPutDir: null,
        fileFormat: 'flv',
        // 是否自动分片
        autoFragment: false,
        // 自动分片 30分钟，1800秒
        fragmentLength: 1800
      },
      oldRecord: null,
      livePlatforms: livePlatform.platforms,
      fileFormats: [],
      user: {},
      lastParseId: null,
      formRules: {
        platform: [
          {required: true, message: '平台信息不能为空', trigger: 'blur'}
        ],
        website: [
          {required: true, message: '不能为空', trigger: 'blur'}
        ],
        channel: [
          {required: true, message: '线路不能为空', trigger: 'blur'}
        ],
        quality: [
          {required: true, message: '清晰度不能为空', trigger: 'blur'}
        ],
        idOrUrl: [
          {required: true, message: 'id或url不能为空', trigger: 'blur'}
        ],
        userName: [
          {required: true, message: '名称不能为空不能为空', trigger: 'blur'}
        ],
        autoCheck: [
          {required: true, message: '不能为空', trigger: 'blur'}
        ],
        checkWindow: [
          {validator: checkWindowValidator, trigger: 'blur', required: true}
        ],
        autoFragment: [
          {required: true, message: '不能为空', trigger: 'blur'}
        ],
        fragmentLength: [
          {trigger: 'blur', required: true}
        ],
        outPutDir: [
          {required: true, message: '输出文件夹不能为空', trigger: 'blur'}
        ],
        fileFormat: [
          {required: true, message: '格式不能为空', trigger: 'blur'}
        ]
      },
      globalSettings: {}
    }
  },
  computed: {
    getIdInputPlaceholder () {
      return this.record.platform ? this.record.platform.defaultConfig.idPlaceholder : ''
    }
  },
  watch: {
    'record.platform': {
      handler (val) {
        this.record.channel = val.getChannelByCode(val)
        this.record.quality = val.getQualityByCode(val)
        this.record.website = val.platformInfo.website
        this.record.outPutDir = this.$manager.recordManager.globalSettings.defaultOuPutDir
        // 如果全局设置设置了默认录制视频输出格式则使用设置，否则取第一个默认值
        if (val.supportVideoOutPutFormats) {
          if (this.globalSettings.defaultRecordVideoOutputFormat && Object.keys(val.supportVideoOutPutFormats).indexOf(this.globalSettings.defaultRecordVideoOutputFormat) > -1) {
            this.record.fileFormat = this.globalSettings.defaultRecordVideoOutputFormat
          } else {
            this.record.fileFormat = Object.keys(val.supportVideoOutPutFormats).length > 0 ? Object.keys(val.supportVideoOutPutFormats)[0] : null
          }
        }
        this.fileFormats = val.supportVideoOutPutFormats ? Object.keys(val.supportVideoOutPutFormats) : []
      },
      deep: true
    },
    'record.autoFragment': {
      handler (val) {
        if (val) {
          this.$message.info('启用分片设置将在下次录制时生效')
        } else {
          this.$message.info('禁用分片设置立即生效，正在录制的任务将不再分片')
        }
      },
      deep: true
    },
    recordId (newRecordId) {
      if (this.edit) {
        // 编辑模式，数据库加载录制设置
        this.$dbs.record.find({_id: newRecordId}, (e, docs) => {
          if (docs.length >= 1) {
            let record = docs[0]
            let platform = null
            for (let _platform of this.livePlatforms) {
              if (_platform.platformInfo.code === record.platform.code) {
                platform = _platform
                break
              }
            }
            if (!platform) {
              return
            }
            this.record.platform = platform
            this.$nextTick(_ => {
              this.user = record.user
              this.record.userName = record.user.name
              this.record.idOrUrl = record.user.idShow
              this.record.channel = platform.getChannelByCode(platform, record.settings.preferenceChannel.code)
              this.record.quality = platform.getQualityByCode(platform, record.settings.preferenceQuality.code)
              this.record.autoCheck = record.settings.autoCheck ? record.settings.autoCheck : false
              this.record.checkWindow = (!record.settings.checkWindow || Number(record.settings.checkWindow)) < 10 ? 10 : record.settings.checkWindow
              this.record.outPutDir = record.settings.outPutDir
              this.record.fileFormat = record.settings.fileFormat
              this.record.autoFragment = record.settings.autoFragment ? record.settings.autoFragment : false
              this.record.fragmentLength = !record.settings.fragmentLength ? 3600 : record.settings.fragmentLength
              this.oldRecord = record
            })
          }
        })
      }
    }
  },
  methods: {
    fileChange (event) {
      if (!event.target.files.length > 0 || !event.target.files[0]) {
        return
      }
      console.log(event.target.files[0].path)
      this.record.outPutDir = event.target.files[0].path
    },
    getUserInfo () {
      if (!this.record.idOrUrl && this.record.idOrUrl === this.lastParseId) {
        return
      }
      // 获取用户信息
      let Platform = this.record.platform
      new Platform().getUserInfo(this.record.idOrUrl).then(res => {
        console.log(res)
        this.record.idOrUrl = res.idShow
        this.user = res
        this.record.userName = res.name
        this.lastParseId = res.idShow
      }).catch(e => {
        this.$message.error('获取用户信息失败')
      })
    },
    save () {
      this.$refs.recordForm.validate(valid => {
        if (valid) {
          this.saveRecord()
        }
      })
    },
    saveRecord () {
      let record = {
        platform: {
          code: this.record.platform.platformInfo.code,
          name: this.record.platform.platformInfo.name,
          website: this.record.platform.platformInfo.website
        },
        user: this.user,
        settings: {
          preferenceChannel: this.record.channel,
          preferenceQuality: this.record.quality,
          outPutDir: this.record.outPutDir,
          autoCheck: this.record.autoCheck,
          checkWindow: this.record.checkWindow,
          fileFormat: this.record.fileFormat,
          autoFragment: this.record.autoFragment,
          fragmentLength: this.record.fragmentLength,
          top: this.oldRecord != null ? this.oldRecord.settings.top : undefined
        },
        status: 0,
        createTime: new Date(),
        lastCheckTime: null
      }
      console.log(record)
      console.log(this.$dbs.record.filename)
      if (this.edit) {
        this.$dbs.record.update({_id: this.recordId}, {$set: {settings: record.settings}}, {}, (e, num) => {
          console.log('更新：' + num)
          if (e) {
            console.log(e)
          }
          if (num) {
            this.$emit('save-success')
          }
        })
      } else {
        this.$dbs.record.find({'user.name': this.user.name}, (e, docs) => {
          if (e) {
            console.log(e)
          }
          if (docs.length > 0) {
            this.$message.error('名称重复')
          } else {
            this.$dbs.record.insert(record, (e, nDoc) => {
              if (nDoc) {
                this.$emit('save-success')
              }
              console.log(nDoc)
            })
          }
        })
      }
    },
    clear () {
      // 重置数据
      this.record = {
        platform: livePlatform.platforms[0],
        channel: null,
        quality: null,
        idOrUrl: null,
        userName: null,
        autoCheck: false,
        checkWindow: 10,
        outPutDir: null,
        fileFormat: 'flv',
        // 是否自动分片
        autoFragment: false,
        // 自动分片 60分钟
        fragmentLength: 3600
      }
      this.lastParseId = null
      this.$refs.recordForm.clearValidate()
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
em.important-help {
  margin-left: 5px;
}
</style>
