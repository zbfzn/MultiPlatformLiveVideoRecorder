<template>
  <base-page :card-body-style="cardBodyStyle" :card-style="cardStyle" :card-loading="cardLoading">
    <div slot="header" class="common-full header-div">
      <slot name="header"/>
    </div>
    <slot slot="main" name="main"/>
    <div slot="footer" class="footer-div">
      <slot name="footer"/>
    </div>
  </base-page>
</template>

<script>
import BasePage from '../BasePage'
export default {
  name: 'CommonPage',
  components: {BasePage},
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
.header-div {
  display: flex;
  align-items: center;
}
.footer-div {
  display: flex;
  align-items: center;
}

</style>
