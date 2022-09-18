<template>
  <ul :style="{width: width, height: height}">
    <li v-for="(img, index) in imgList" :key="img.id ? img.imgUrl + img.title : img.id" @click.stop="onClick(index, img)">
      <div style="display: inline;">
        <el-image :src="img.imgUrl" class="cover-img" alt="" lazy/>
        <div class="title-box">
          <el-checkbox v-model="img.checked" @click.stop.native="" @change="checked => {img.checked = !checked;onClick(index, img)}"></el-checkbox>
          <span v-if="showIndex">{{ (index + 1)}}.</span>
          <el-tooltip  v-if="img.title && img.title.length > (showIndex ? 8 : 11)" :content="img.title" placement="bottom" effect="light">
            <span>{{img.title.substr(0, (showIndex ? 8 : 11)) + '...'}}</span>
          </el-tooltip>
          <span v-else>{{img.title}}</span>
        </div>
      </div>
    </li>
  </ul>
</template>

<script>
export default {
  name: 'ImageList',
  data () {
    return {
      selection: [],
      imgList: []
    }
  },
  mounted () {
    console.log('imageList加载了')
    this.selection = []
    this.imgList = JSON.parse(JSON.stringify(this.imgData))
  },
  computed: {
  },
  watch: {
    imgData: {
      handler (nval) {
        console.log('改变了')
        this.selection = []
        this.imgList = JSON.parse(JSON.stringify(nval))
      },
      deep: true
    }
  },
  props: {
    imgData: {
      type: Array,
      required: true
    },
    width: {
      type: String,
      required: false,
      default: '100%'
    },
    height: {
      type: String,
      required: false,
      default: '100%'
    },
    showIndex: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    onClick (index, img) {
      img.checked = !img.checked
      this.$set(this.imgList, index, img)
      if (img.checked) {
        console.log('checked')
        this.selection.push(img)
      } else {
        this.selection.splice(this.selection.indexOf(img), 1)
      }
      this.$emit('selection-change', JSON.parse(JSON.stringify(this.selection)))
      console.log(this.selection)
    },
    /**
     * 清空已选择内容
     */
    clearSelection () {
      this.selection = []
      for (let i = 0; i < this.imgList.length; i++) {
        const img = this.imgList[i]
        img.checked = false
        this.$set(this.imgList, i, img)
      }
      this.$emit('selection-change', JSON.parse(JSON.stringify(this.selection)))
    },
    selectAll () {
      const selection = []
      for (let i = 0; i < this.imgList.length; i++) {
        const img = this.imgList[i]
        img.checked = true
        this.$set(this.imgList, i, img)
        selection.push(img)
      }
      this.selection = selection
      this.$emit('selection-change', JSON.parse(JSON.stringify(this.selection)))
    }
  }
}
</script>

<style scoped>
ul,li {
  list-style: none;
}
ul {
  overflow-y: auto;
}
li {
  /*行内块级元素*/
  display: inline-block;
  margin: 7px 5px 7px 5px
}
.title-box {
  width: 180px;
  font-size: 13px;
  font-style: normal;
  /*取消换行*/
  white-space: nowrap;
  padding: 0;
}
.cover-box {
  width: 180px;
  height: 120px;
}
.cover-img {
  width: 180px;
  height: 120px;
}
.el-checkbox {
  margin: 2px;
  width: 20px;
}
ul {
  padding-left: 0;
}
</style>
