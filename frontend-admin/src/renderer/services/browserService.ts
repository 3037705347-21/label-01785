/**
 * 浏览器服务 - 统一接口
 * 在 Electron 环境下使用 IPC 通信（本地浏览器）
 * 在 Web 环境下使用 HTTP API（服务器端浏览器，功能受限）
 */

import { browserApi } from './api'

// 检测是否在 Electron 环境中运行
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' &&
         typeof window.electronAPI !== 'undefined'
}

export interface BrowserStatus {
  isConnected: boolean
  url: string
  title: string
}

export interface BrowserService {
  launch(): Promise<void>
  close(): Promise<void>
  navigate(url: string): Promise<void>
  click(selector: string): Promise<void>
  type(selector: string, text: string): Promise<void>
  screenshot(): Promise<string>
  scroll(direction: 'top' | 'bottom'): Promise<void>
  wait(ms: number): Promise<void>
  getStatus(): Promise<BrowserStatus>
  goBack(): Promise<void>
  goForward(): Promise<void>
  refresh(): Promise<void>
}

// 统一的浏览器服务 - 运行时检测环境
class UnifiedBrowserService implements BrowserService {

  private get useElectron(): boolean {
    return isElectron()
  }

  private get electronApi() {
    return window.electronAPI!
  }

  async launch(): Promise<void> {
    if (this.useElectron) {
      await this.electronApi.browser.launch()
    } else {
      await browserApi.launch()
    }
  }

  async close(): Promise<void> {
    if (this.useElectron) {
      await this.electronApi.browser.close()
    } else {
      await browserApi.close()
    }
  }

  async navigate(url: string): Promise<void> {
    if (this.useElectron) {
      await this.electronApi.browser.navigate(url)
    } else {
      await browserApi.navigate(url)
    }
  }

  async click(selector: string): Promise<void> {
    if (this.useElectron) {
      await this.electronApi.browser.click(selector)
    } else {
      throw new Error('Web 模式不支持点击操作')
    }
  }

  async type(selector: string, text: string): Promise<void> {
    if (this.useElectron) {
      await this.electronApi.browser.type(selector, text)
    } else {
      throw new Error('Web 模式不支持输入操作')
    }
  }

  async screenshot(): Promise<string> {
    if (this.useElectron) {
      return await this.electronApi.browser.screenshot()
    } else {
      const res = await browserApi.screenshot()
      return (res.data as { image?: string })?.image || ''
    }
  }

  async scroll(direction: 'top' | 'bottom'): Promise<void> {
    if (this.useElectron) {
      await this.electronApi.browser.scroll(direction)
    } else {
      throw new Error('Web 模式不支持滚动操作')
    }
  }

  async wait(ms: number): Promise<void> {
    if (this.useElectron) {
      await this.electronApi.browser.wait(ms)
    } else {
      return new Promise(resolve => setTimeout(resolve, ms))
    }
  }

  async getStatus(): Promise<BrowserStatus> {
    if (this.useElectron) {
      return await this.electronApi.browser.getStatus()
    } else {
      const res = await browserApi.status()
      return {
        isConnected: (res.data as { isConnected?: boolean })?.isConnected || false,
        url: '',
        title: ''
      }
    }
  }

  async goBack(): Promise<void> {
    if (this.useElectron) {
      await this.electronApi.browser.goBack()
    } else {
      throw new Error('Web 模式不支持此操作')
    }
  }

  async goForward(): Promise<void> {
    if (this.useElectron) {
      await this.electronApi.browser.goForward()
    } else {
      throw new Error('Web 模式不支持此操作')
    }
  }

  async refresh(): Promise<void> {
    if (this.useElectron) {
      await this.electronApi.browser.refresh()
    } else {
      throw new Error('Web 模式不支持此操作')
    }
  }
}

// 导出服务实例
export const browserService: BrowserService = new UnifiedBrowserService()

// 导出运行模式信息（运行时检测）
export const getRunningMode = (): 'electron' | 'web' => {
  return isElectron() ? 'electron' : 'web'
}
