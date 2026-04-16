import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 浏览器控制
  browser: {
    launch: () => ipcRenderer.invoke('browser:launch'),
    close: () => ipcRenderer.invoke('browser:close'),
    navigate: (url: string) => ipcRenderer.invoke('browser:navigate', url),
    click: (selector: string) => ipcRenderer.invoke('browser:click', selector),
    type: (selector: string, text: string) => ipcRenderer.invoke('browser:type', selector, text),
    screenshot: async () => {
      const result = await ipcRenderer.invoke('browser:screenshot')
      return result.image || ''
    },
    scroll: (direction: 'top' | 'bottom') => ipcRenderer.invoke('browser:scroll', direction),
    wait: (ms: number) => ipcRenderer.invoke('browser:wait', ms),
    getStatus: () => ipcRenderer.invoke('browser:status'),
    goBack: () => ipcRenderer.invoke('browser:back'),
    goForward: () => ipcRenderer.invoke('browser:forward'),
    refresh: () => ipcRenderer.invoke('browser:refresh')
  },

  // 任务执行
  task: {
    execute: (taskId: string, steps: unknown[]) => ipcRenderer.invoke('task:execute', taskId, steps),
    pause: (taskId: string) => ipcRenderer.invoke('task:pause', taskId),
    resume: (taskId: string) => ipcRenderer.invoke('task:resume', taskId),
    stop: (taskId: string) => ipcRenderer.invoke('task:stop', taskId)
  },

  // 事件监听
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'browser:state-changed',
      'browser:screenshot',
      'task:step-completed',
      'task:completed',
      'task:error',
      'log:message'
    ]

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },

  // 移除监听
  removeListener: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// 类型声明
declare global {
  interface Window {
    electronAPI: {
      browser: {
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
      task: {
        execute: (taskId: string, steps: unknown[]) => Promise<void>
        pause: (taskId: string) => Promise<void>
        resume: (taskId: string) => Promise<void>
        stop: (taskId: string) => Promise<void>
      }
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      removeListener: (channel: string) => void
    }
  }
}
