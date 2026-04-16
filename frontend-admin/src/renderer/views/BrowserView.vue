<template>
  <div class="browser-page">
    <!-- 顶部标题栏 -->
    <header class="app-header">
      <div class="app-title">
        <el-icon :size="24"><Monitor /></el-icon>
        <span>AI 浏览器自动化</span>
      </div>
      <div class="connection-status">
        <span class="status-dot" :class="{ connected: isConnected }"></span>
        <span>{{ isConnected ? '浏览器已连接' : '浏览器未连接' }}</span>
      </div>
    </header>

    <div class="browser-layout">
      <!-- 左侧控制面板 -->
      <div class="control-panel">
        <!-- 浏览器控制 -->
        <div class="panel-section">
          <div class="section-header">浏览器控制</div>
          <div class="browser-actions">
            <el-button
              v-if="!isConnected"
              type="primary"
              :disabled="launching"
              @click="launchBrowser"
            >
              <el-icon v-if="launching" class="is-loading"><Loading /></el-icon>
              <el-icon v-else><VideoPlay /></el-icon>
              <span>启动浏览器</span>
            </el-button>
            <el-button
              v-else
              type="danger"
              plain
              @click="closeBrowser"
            >
              <el-icon><Close /></el-icon>
              <span>关闭浏览器</span>
            </el-button>
          </div>
        </div>

        <!-- 导航 -->
        <div class="panel-section">
          <div class="section-header">网址导航</div>
          <div class="url-input">
            <el-input
              v-model="targetUrl"
              placeholder="输入网址，如 baidu.com"
              :disabled="!isConnected"
              @keyup.enter="navigate"
            >
              <template #prefix>
                <el-icon><Link /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" :disabled="!isConnected" @click="navigate">
              前往
            </el-button>
          </div>
          <div class="nav-buttons">
            <el-button :disabled="!isConnected" @click="goBack">
              <el-icon><Back /></el-icon>
            </el-button>
            <el-button :disabled="!isConnected" @click="goForward">
              <el-icon><Right /></el-icon>
            </el-button>
            <el-button :disabled="!isConnected" @click="refreshPage">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 自然语言指令 -->
        <div class="panel-section command-section">
          <div class="section-header">
            <el-icon><ChatDotRound /></el-icon>
            自然语言指令
          </div>
          <el-input
            v-model="command"
            type="textarea"
            :rows="4"
            placeholder="用自然语言描述你想执行的操作，例如：&#10;• 打开百度搜索Vue教程&#10;• 点击登录按钮&#10;• 在输入框中输入Hello"
            :disabled="!isConnected"
          />
          <el-button
            class="execute-btn"
            type="primary"
            size="large"
            :disabled="!isConnected || !command.trim() || executing"
            @click="executeCommand"
          >
            <el-icon v-if="executing" class="is-loading"><Loading /></el-icon>
            <el-icon v-else><VideoPlay /></el-icon>
            <span>执行指令</span>
          </el-button>
        </div>

        <!-- 快捷操作 -->
        <div class="panel-section">
          <div class="section-header">快捷操作</div>
          <div class="quick-actions">
            <button class="action-btn" :disabled="!isConnected" @click="takeScreenshot">
              <span class="emoji">📷</span>
              <span class="label">截图</span>
            </button>
            <button class="action-btn" :disabled="!isConnected" @click="scrollToTop">
              <span class="emoji">⬆️</span>
              <span class="label">顶部</span>
            </button>
            <button class="action-btn" :disabled="!isConnected" @click="scrollToBottom">
              <span class="emoji">⬇️</span>
              <span class="label">底部</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧浏览器预览 -->
      <div class="preview-panel">
        <div class="preview-header">
          <div class="window-controls">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="address-bar">
            <el-icon><Lock /></el-icon>
            <span>{{ currentUrl || '空白页' }}</span>
          </div>
          <el-button text :disabled="!isConnected" @click="refreshScreenshot">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
        <div class="preview-content">
          <div v-if="!isConnected" class="placeholder">
            <el-icon :size="80"><Monitor /></el-icon>
            <p>点击"启动浏览器"开始</p>
          </div>
          <div v-else-if="isLoading" class="placeholder">
            <el-icon :size="40" class="is-loading"><Loading /></el-icon>
            <p>加载中...</p>
          </div>
          <img v-else-if="screenshot" :src="screenshot" alt="浏览器截图" />
          <div v-else class="placeholder">
            <el-icon :size="60"><Picture /></el-icon>
            <p>导航到网页后显示预览</p>
          </div>
        </div>
        <div v-if="pageTitle" class="preview-footer">
          {{ pageTitle }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, Close, Loading } from '@element-plus/icons-vue'
import { browserService, getRunningMode } from '@/services/browserService'
import { parseNaturalLanguage } from '@/services/aiParser'

// 状态
const isConnected = ref(false)
const isLoading = ref(false)
const launching = ref(false)
const executing = ref(false)
const targetUrl = ref('')
const command = ref('')
const currentUrl = ref('')
const pageTitle = ref('')
const screenshot = ref('')

onMounted(() => {
  if (getRunningMode() === 'web') {
    ElMessage.warning('当前为 Web 模式，功能受限。请使用 npm run dev:electron 启动桌面应用。')
  }
})

async function launchBrowser() {
  // Web 模式下直接提示，不尝试启动
  if (getRunningMode() === 'web') {
    ElMessage.warning('Web 模式不支持启动本地浏览器，请使用 npm run dev:electron 启动桌面应用')
    return
  }

  launching.value = true
  try {
    await browserService.launch()
    isConnected.value = true
    ElMessage.success('浏览器启动成功')
    await refreshScreenshot()
  } catch (error) {
    ElMessage.error('启动失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    launching.value = false
  }
}

async function closeBrowser() {
  try {
    await browserService.close()
    isConnected.value = false
    currentUrl.value = ''
    pageTitle.value = ''
    screenshot.value = ''
    ElMessage.success('浏览器已关闭')
  } catch (error) {
    ElMessage.error('关闭失败')
  }
}

async function navigate() {
  if (!targetUrl.value.trim()) {
    ElMessage.warning('请输入网址')
    return
  }

  let url = targetUrl.value.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  isLoading.value = true
  try {
    await browserService.navigate(url)
    currentUrl.value = url
    const status = await browserService.getStatus()
    pageTitle.value = status.title
    currentUrl.value = status.url || url
    await refreshScreenshot()
    ElMessage.success('导航成功')
  } catch (error) {
    ElMessage.error('导航失败')
  } finally {
    isLoading.value = false
  }
}

async function goBack() {
  try {
    await browserService.goBack()
    await refreshScreenshot()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

async function goForward() {
  try {
    await browserService.goForward()
    await refreshScreenshot()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

async function refreshPage() {
  isLoading.value = true
  try {
    await browserService.refresh()
    await refreshScreenshot()
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    isLoading.value = false
  }
}

async function takeScreenshot() {
  try {
    const image = await browserService.screenshot()
    if (image) {
      screenshot.value = image
      ElMessage.success('截图已更新')
    }
  } catch (error) {
    ElMessage.error('截图失败')
  }
}

async function refreshScreenshot() {
  try {
    const image = await browserService.screenshot()
    if (image) screenshot.value = image
  } catch {
    // 静默
  }
}

async function scrollToTop() {
  try {
    await browserService.scroll('top')
    await refreshScreenshot()
    ElMessage.success('已滚动到顶部')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

async function scrollToBottom() {
  try {
    await browserService.scroll('bottom')
    await refreshScreenshot()
    ElMessage.success('已滚动到底部')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

async function executeCommand() {
  if (!command.value.trim()) return

  executing.value = true
  try {
    const steps = parseNaturalLanguage(command.value)

    if (steps.length === 0) {
      ElMessage.warning('无法解析指令，请尝试更明确的描述，例如：点击登录按钮、在搜索框输入Vue')
      executing.value = false
      return
    }

    for (const step of steps) {
      ElMessage.info(`正在执行: ${step.description}`)

      try {
        switch (step.type) {
          case 'navigate':
            await browserService.navigate(step.params.url as string)
            currentUrl.value = step.params.url as string
            break
          case 'click':
            await browserService.click(step.params.text as string || step.params.selector as string)
            break
          case 'type':
            await browserService.type(step.params.selector as string || '', step.params.text as string)
            break
          case 'scroll':
            await browserService.scroll(step.params.direction as 'top' | 'bottom')
            break
          case 'wait':
            await browserService.wait(step.params.duration as number)
            break
          case 'screenshot':
            await takeScreenshot()
            break
          case 'refresh':
            await browserService.refresh()
            break
          case 'back':
            await browserService.goBack()
            break
          case 'forward':
            await browserService.goForward()
            break
        }
      } catch (stepError) {
        const errorMsg = stepError instanceof Error ? stepError.message : '操作失败'
        ElMessage.error(errorMsg)
        executing.value = false
        return
      }

      await refreshScreenshot()
      await browserService.wait(300)
    }

    ElMessage.success('指令执行完成')
    command.value = ''
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '执行失败'
    ElMessage.error(errorMsg)
  } finally {
    executing.value = false
  }
}
</script>

<style lang="scss" scoped>
.browser-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #909399;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f56c6c;

  &.connected {
    background: #67c23a;
    animation: pulse 2s infinite;
  }
}

.browser-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.panel-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.browser-actions {
  .el-button {
    width: 100%;
    height: 44px;
    font-size: 15px;
  }
}

.url-input {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.nav-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.command-section {
  flex: 1;
  display: flex;
  flex-direction: column;

  .el-textarea {
    margin-bottom: 0;
  }

  .execute-btn {
    margin-top: 12px;
    height: 44px;
    font-size: 15px;
  }
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 72px;
    padding: 12px 8px;
    border-radius: 10px;
    border: 1px solid #e4e7ed;
    background: #fafafa;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: #ecf5ff;
      border-color: #409eff;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .emoji {
      font-size: 24px;
      line-height: 1;
      margin-bottom: 6px;
    }

    .label {
      font-size: 13px;
      color: #606266;
    }
  }
}

.preview-panel {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: linear-gradient(180deg, #f8f9fa 0%, #f0f2f5 100%);
  border-bottom: 1px solid #e4e7ed;
}

.window-controls {
  display: flex;
  gap: 6px;

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;

    &.red { background: #ff5f57; }
    &.yellow { background: #ffbd2e; }
    &.green { background: #28ca41; }
  }
}

.address-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  font-size: 13px;
  color: #606266;

  .el-icon {
    color: #67c23a;
    flex-shrink: 0;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  overflow: hidden;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #909399;

  p {
    margin: 0;
    font-size: 14px;
  }
}

.preview-footer {
  padding: 10px 14px;
  background: #f8f9fa;
  border-top: 1px solid #e4e7ed;
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
