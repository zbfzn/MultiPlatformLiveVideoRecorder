<template>
  <div class="common-full">
    <el-container direction="horizontal">
      <el-aside style="width: 170px;">
        <left-menus id="lay-index-left-menus"/>
      </el-aside>
      <el-main>
        <app-main/>
      </el-main>
    </el-container>
  </div>
</template>

<script>
import LeftMenus from './components/LeftMenus'
import AppMain from './components/AppMain'
export default {
  name: 'Layout',
  components: {AppMain, LeftMenus}
}
</script>

<style scoped>
.el-container {
  width: 100%;
  height: 100%;
  padding: 0;
}
.el-main {
  /*width: 75%;*/
  height: 100%;
  padding: 0;
}
.el-aside {
  height: 100%;
  padding: 0;
}
.el-page-header {
  height: 100%;
  align-items: center;
}
.el-page-header__content {
  font-weight: bold;
}
.app-main {
  height: 100%;
}
#lay-index-left-menus {
  width: 100%;
}
</style>
