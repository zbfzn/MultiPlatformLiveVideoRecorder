<template>
  <sub-page ref="subPage" key="edit">
    <template slot="main">
      <detail-form ref="detailForm" key="edit" :edit="true" :record-id="recordId" @save-success="saveSuccess"/>
    </template>
  </sub-page>
</template>

<script>
import DetailForm from './components/DetailForm'
import SubPage from '../../SubPage'
export default {
  name: 'Edit',
  components: {SubPage, DetailForm},
  data () {
    return {
      recordId: null
    }
  },
  methods: {
    saveSuccess () {
      this.$refs.subPage.routeBack()
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.recordId = vm.$route.params.id
      vm.$refs.subPage.beforeRouteBack(() => {
        return {pageInfo: vm.$route.params.pageInfo}
      })
      vm.$refs.subPage.afterRouteBack(() => {
        vm.recordId = null
        vm.$refs.detailForm.clear()
      })
    })
  }
}
</script>

<style scoped>

</style>
