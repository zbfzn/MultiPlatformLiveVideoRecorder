<template>
  <base-page :card-body-style="cardBodyStyle" :card-style="cardStyle" :card-loading="cardLoading">
    <el-page-header slot="header" @back="routeBack">
      <label slot="content">{{this.$route.meta ? this.$route.meta.title : ''}}</label>
    </el-page-header>
    <slot slot="main" name="main"/>
    <slot slot="footer" name="footer"/>
  </base-page>
</template>

<script>
import BasePage from '../BasePage'
export default {
  name: 'SubPage',
  components: {BasePage},
  data () {
    return {
      beforeRouteBackCallBack: null,
      afterRouteBackCallBack: null,
      defaultRouteBackParams: null
    }
  },
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
  },
  methods: {
    routeBack (params) {
      let extralParams = null
      if (this.beforeRouteBackCallBack) {
        extralParams = this.beforeRouteBackCallBack()
      }
      if (params) {
        params = Object.assign(params, extralParams)
      } else if (extralParams) {
        params = extralParams
      } else {
        params = {}
      }
      this.$routeBack(this.$route, params)
      if (this.afterRouteBackCallBack) {
        this.afterRouteBackCallBack()
      }
    },
    beforeRouteBack (callback) {
      this.beforeRouteBackCallBack = callback
    },
    afterRouteBack (callback) {
      this.afterRouteBackCallBack = callback
    }
  }
}
</script>

<style scoped>
.el-header {
  background-color: #eeeeee;
}
.el-page-header {
  height: 100%;
  align-items: center;
  color: black;
}
label {
  font-weight: bold;
  color: black;
}
</style>
