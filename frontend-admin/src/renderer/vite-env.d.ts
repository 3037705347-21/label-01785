/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'element-plus/dist/locale/zh-cn.mjs' {
  const locale: any
  export default locale
}

// Electron API 类型声明
interface ElectronBrowserAPI {
  launch: () => Promise<void>
  close: () => Promise<void>
  navigate: (url: string) => Promise<void>
  click: (selector: string) => Promise<void>
  type: (selector: string, text: string) => Promise<void>
  screenshot: () => Promise<string>
  scroll: (direction: 'top' | 'bottom') => Promise<void>
  wait: (ms: number) => Promise<void>
  getStatus: () => Promise<{ isConnected: boolean; url: string; title: string }>
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  refresh: () => Promise<void>
}

interface ElectronTaskAPI {
  execute: (taskId: string, steps: unknown[]) => Promise<void>
  pause: (taskId: string) => Promise<void>
  resume: (taskId: string) => Promise<void>
  stop: (taskId: string) => Promise<void>
}

interface ElectronAPI {
  browser: ElectronBrowserAPI
  task: ElectronTaskAPI
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  removeListener: (channel: string) => void
}

interface Window {
  electronAPI?: ElectronAPI
}
