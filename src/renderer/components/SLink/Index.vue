<template>
  <el-tooltip placement="top">
    <label slot="content">点击打开链接</label>
    <em class="link" @click="openInBrowser">{{text}}</em>
  </el-tooltip>
</template>
<!-- 外部浏览器打开链接 -->
<script>
import {remote} from 'electron'
export default {
  name: 'SLink',
  props: {
    href: {
      type: String
    },
    text: {
      type: String,
      default () {
        return this.href
      }
    }
  },
  methods: {
    openInBrowser () {
      if (!this.href) {
        return
      }
      remote.shell.openExternal(this.href)
    }
  }
}
</script>

<style scoped>
em.link {
  text-decoration: underline;
}
em.link:hover {
  color: blue;
  cursor: pointer;
}
</style>
