import Vue from 'vue'
import Router from 'vue-router'
import Layout from '@/components/Layout'

Vue.use(Router)

const routes = [
  {
    path: '/',
    name: 'home',
    redirect: '/record'
  },
  {
    path: '/record',
    name: 'Record',
    component: Layout,
    children: [
      {
        path: '',
        component: () => import('@/components/Views/Record'),
        name: 'RecordIndex',
        menuRoute: true,
        meta: { title: '自动录制', icon: 'el-icon-video-camera-solid' }
      },
      {
        path: 'add',
        component: () => import('@/components/Views/Record/Add.vue'),
        name: 'RecordAdd',
        meta: { title: '新增录制' }
      },
      {
        path: 'edit',
        component: () => import('@/components/Views/Record/Edit.vue'),
        name: 'RecordEdit',
        meta: { title: '录制设置' }
      },
      {
        path: 'history',
        component: () => import('@/components/Views/Record/History.vue'),
        name: 'RecordHistory',
        meta: { title: '录制记录' }
      }
    ]
  },
  {
    path: '/video-download',
    name: 'VideoDownload',
    component: Layout,
    children: [
      {
        path: '',
        component: () => import('@/components/Views/VideoDownload'),
        name: 'VideoDownloadIndex',
        menuRoute: true,
        meta: { title: '视频下载', icon: 'el-icon-sold-out' }
      },
      {
        path: '/download-manager',
        component: () => import('@/components/Views/VideoDownload/DownloadManager.vue'),
        name: 'DownloadManager',
        meta: { title: '下载管理' }
      }
    ]
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Layout,
    children: [
      {
        path: '',
        component: () => import('@/components/Views/Settings'),
        name: 'SettingsIndex',
        menuRoute: true,
        meta: { title: '软件设置', icon: 'el-icon-setting' }
      }
    ]
  },
  {
    path: '/about',
    name: 'About',
    component: Layout,
    children: [
      {
        path: '',
        component: () => import('@/components/Views/About'),
        name: 'AboutIndex',
        menuRoute: true,
        meta: { title: '关于', icon: 'el-icon-info' }
      }
    ]
  },
  {
    path: '*',
    redirect: '/'
  }
]

const router = new Router({
  routes: routes
})

export default router
