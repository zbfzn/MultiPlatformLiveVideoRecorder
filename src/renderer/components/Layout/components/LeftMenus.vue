<template>
  <div class="common-full">
    <el-menu
        :default-active="routesToMenus[0].index"
        class="el-menu-vertical"
        router>
      <el-menu-item v-for="menu in routesToMenus" :index="menu.index" :key="menu.index">
        <em :class="menu.icon"></em>
        <span slot="title">{{menu.title}}</span>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script>
export default {
  name: 'LeftMenus',
  computed: {
    routesToMenus: function () {
      // 从路由加载菜单
      // debugger
      let routes = this.$router.options.routes
      // 所有路由信息
      let allRoutes = [...routes]
      // 将要转换为菜单的路由
      let menuRoutes = []
      // 迭代获取所有路由
      while (allRoutes.length > 0) {
        let route = allRoutes.shift()
        let children = route.children
        if (!route.fullInitPath) {
          // 初始化路由全路径
          route.fullInitPath = route.path.lastIndexOf('/') === route.path.length - 1 && route.path !== '/' ? route.path.substring(0, route.path.length - 1) : route.path
        }
        if (children) {
          // 如果有子路由则放到最前
          for (let i = children.length - 1; i >= 0; i--) {
            // 初始化子路由全路径
            let cRoute = children[i]
            cRoute.fullInitPath = route.fullInitPath + (cRoute.path.indexOf('/') === 0 || route.fullInitPath === '/' ? cRoute.path : '/' + cRoute.path)
            allRoutes.unshift(cRoute)
          }
        }
        if (route.menuRoute) {
          // 路由转换菜单
          let menuRoute = {
            // 路由全路径作为menu index
            index: route.fullInitPath,
            title: route.meta.title,
            icon: route.meta.icon
          }
          menuRoutes.push(menuRoute)
        }
      }
      return menuRoutes
    }
  },
  data: function () {
    return {
      // menus: [
      //   {
      //     index: '1',
      //     title: '首页',
      //     iconClass: 'el-icon-menu'
      //   }
      // ]
    }
  },
  methods: {
    // handleOpen: function () {
    // }
  }
}
</script>

<style scoped>
.el-menu {
  height: 100%;
  font-weight: bold;
}
</style>
