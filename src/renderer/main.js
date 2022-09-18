import Vue from 'vue'
import axios from 'axios'
import request from 'request'

import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

import App from './App'
import router from './router'

import dbs from './db'
import Global from './global'

// 引入iconfont图标
import '../../static/styles/iconfont.css'
import manager from './manager'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.use(ElementUI)

Vue.http = Vue.prototype.$http = axios
Vue.prototype.$request = request
// 数据库组件
Vue.prototype.$dbs = dbs
Vue.config.productionTip = false

// 全局设置
Global.init()

// 全局唯一
Vue.use(manager)

/* eslint-disable no-new */
let vm = new Vue({
  components: { App },
  router,
  template: '<App/>'
}).$mount('#app')

// 增加路由跳转函数
Vue.prototype.$routeTo = (path, name, params) => {
  vm.$router.push({
    path: path,
    name: name,
    params: {
      fromPath: vm.$route.fullPath,
      fromName: vm.$route.name,
      ...params
    }
  })
}
// 从当前路由获取上一路由信息并返回，没有则不返回
Vue.prototype.$routeBack = (backRoute, params) => {
  if (!backRoute.params || !backRoute.params.fromPath || !backRoute.params.fromName) {
    return
  }
  vm.$router.push({
    path: backRoute.params.fromPath,
    name: backRoute.params.fromName,
    params: params
  })
}
