// 应用常量
export const APP_NAME = 'AI Browser Automation'
export const APP_VERSION = '1.0.0'

// API 端点（Web 模式降级使用）
export const API_BASE_URL = '/api'

// 浏览器配置
export const BROWSER_CONFIG = {
  defaultViewport: {
    width: 1280,
    height: 720
  },
  headless: false,
  slowMo: 50
}

// 人工模拟配置
export const HUMAN_SIMULATION = {
  typingDelay: { min: 50, max: 150 },
  clickDelay: { min: 100, max: 300 },
  scrollDelay: { min: 500, max: 1500 },
  mouseMoveDuration: { min: 200, max: 500 }
}
