const puppeteer = require('puppeteer')

class BrowserService {
  constructor() {
    this.browser = null
    this.page = null
    this.isConnected = false
    this.broadcast = null
  }

  setBroadcast(fn) {
    this.broadcast = fn
  }

  async launch() {
    if (this.browser) {
      return
    }

    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]

    // Docker 环境使用系统 Chromium
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined

    this.browser = await puppeteer.launch({
      headless: 'new',
      executablePath,
      args,
      defaultViewport: {
        width: 1280,
        height: 720
      }
    })

    this.page = await this.browser.newPage()
    this.isConnected = true

    // 监听页面事件
    this.page.on('load', () => {
      this.notifyStateChange()
    })

    this.notifyStateChange()
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
      this.isConnected = false
      this.notifyStateChange()
    }
  }

  async navigate(url) {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    this.notifyStateChange()
  }

  async click(selector) {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    await this.page.waitForSelector(selector, { timeout: 10000 })
    await this.page.click(selector)
  }

  async type(selector, text) {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    await this.page.waitForSelector(selector, { timeout: 10000 })
    await this.page.type(selector, text, { delay: 50 })
  }

  async screenshot(fullPage = false) {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    const buffer = await this.page.screenshot({
      fullPage,
      encoding: 'base64'
    })

    return `data:image/png;base64,${buffer}`
  }

  async scroll(direction) {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    if (direction === 'bottom') {
      await this.page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
      })
    } else {
      await this.page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    }
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      currentUrl: this.page?.url() || '',
      title: '',
      isLoading: false
    }
  }

  async getTitle() {
    if (!this.page) return ''
    return await this.page.title()
  }

  notifyStateChange() {
    if (this.broadcast) {
      this.broadcast('browser_state', this.getStatus())
    }
  }
}

module.exports = { BrowserService }
