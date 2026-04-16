<template>
  <div class="app-container">
    <el-config-provider :locale="zhCn">
      <router-view />
    </el-config-provider>
  </div>
</template>

<script setup lang="ts">
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
</script>

<style lang="scss">
.app-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
