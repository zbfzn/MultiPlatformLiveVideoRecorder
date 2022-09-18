<template>
  <sub-page ref="subPage" key="add">
    <template slot="main">
      <detail-form ref="detailForm" key="add" @save-success="saveSuccess"/>
    </template>
  </sub-page>
</template>

<script>
import SubPage from '../../SubPage'
import DetailForm from './components/DetailForm'
export default {
  name: 'Add',
  components: {DetailForm, SubPage},
  data () {
    return {}
  },
  computed: {
  },
  watch: {
  },
  methods: {
    saveSuccess () {
      this.$refs.subPage.beforeRouteBack(() => {})
      this.$refs.subPage.routeBack()
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.$refs.subPage.afterRouteBack(() => {
        vm.$refs.detailForm.clear()
      })
      vm.$refs.subPage.beforeRouteBack(() => {
        console.log('返回')
        return {pageInfo: vm.$route.params.pageInfo}
      })
    })
  }
}
</script>

<style scoped>
.el-input {
  width: auto;
}
label {
  font-weight: bold;
  color: black;
}
</style>
