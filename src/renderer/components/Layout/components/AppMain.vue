<template>
  <!-- 不能加缓存 -->
  <router-view :key="key" style="background-color: #c3d9ff"/>
</template>

<script>
export default {
  name: 'AppMain',
  computed: {
    key () {
      return this.$route.path
    }
  }
}
</script>

<style scoped>

</style>
