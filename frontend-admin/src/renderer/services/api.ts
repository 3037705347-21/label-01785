import axios from 'axios'
import { API_BASE_URL } from '@shared/constants'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 浏览器相关 API（Web 模式降级使用）
export const browserApi = {
  launch: () => api.post('/browser/launch'),
  close: () => api.post('/browser/close'),
  status: () => api.get('/browser/status'),
  screenshot: () => api.get('/browser/screenshot'),
  navigate: (url: string) => api.post('/browser/navigate', { url })
}

export default api
