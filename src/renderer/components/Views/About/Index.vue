<template>
  <common-page>
    <h1 slot="header">{{$route.meta.title}}</h1>
    <template slot="main">
      <el-form>
        <el-form-item
            label="作者："
            style="white-space: nowrap"
        >
          ZuoBro
        </el-form-item>
        <el-form-item
            label="Github："
        >
          <s-link href="https://github.com/zbfzn"></s-link>
        </el-form-item>
      </el-form>
    </template>
  </common-page>
</template>

<script>
import CommonPage from '../../CommonPage'
import SLink from '../../SLink'
export default {
  name: 'Index',
  components: {SLink, CommonPage},
  data () {
    return {
    }
  }
}
</script>

<style scoped>

</style>
