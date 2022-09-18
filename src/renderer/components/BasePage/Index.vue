<template>
  <div class="common-full">
    <el-container>
      <el-header>
        <slot name="header"/>
      </el-header>
      <el-main>
        <el-card v-loading="cardLoading" class="box-card" :style="cardStyle" :body-style="cardBodyStyle">
          <slot name="main"/>
        </el-card>
      </el-main>
      <el-footer>
          <slot name="footer"/>
      </el-footer>
    </el-container>
  </div>
</template>

<script>
export default {
  name: 'BasePage',
  props: {
    cardBodyStyle: {
      type: Object,
      default: function () {
        return {}
      }
    },
    cardStyle: {
      type: Object,
      default: function () {
        return {}
      }
    },
    cardLoading: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.el-header {
  padding: 10px 0 0;
  height: auto;
  width: 95%;
  align-self: center;
}
.el-footer {
  padding: 10px 0 0;
  /*height: auto;*/
  width: 90%;
  align-self: center;
}
.el-container {
  width: 100%;
  height: 100%;
}
.el-main {
  width: 95%;
  height: 90%;
  padding: 0;
  margin-bottom: 20px;
  margin-top: 10px;
  align-self: center;
}
.el-card {
  width: auto;
  height: 100%;
  margin-bottom: -10px;
}
.box-card {
  overflow-y:auto
}
</style>
