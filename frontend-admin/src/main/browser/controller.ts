import puppeteer, { Browser, Page, ElementHandle, KeyInput } from 'puppeteer'

// 本地运行时使用可见浏览器
const BROWSER_CONFIG = {
  headless: false,  // 显示浏览器窗口
  defaultViewport: {
    width: 1280,
    height: 720
  },
  slowMo: 50,
  args: [
    '--start-maximized',
    '--disable-infobars',
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
}

const HUMAN_SIMULATION = {
  typingDelay: { min: 30, max: 100 },
  clickDelay: { min: 100, max: 300 },
  mouseMoveDuration: { min: 200, max: 500 },
  scrollDelay: { min: 300, max: 600 }
}

export class BrowserController {
  private browser: Browser | null = null
  private page: Page | null = null
  private isConnected = false

  // 随机延迟，模拟人工操作
  private randomDelay(range: { min: number; max: number }): number {
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
  }

  // 模拟人工打字
  private async humanType(text: string): Promise<void> {
    if (!this.page) return

    for (const char of text) {
      await this.page.keyboard.type(char)
      await this.wait(this.randomDelay(HUMAN_SIMULATION.typingDelay))
    }
  }

  // 模拟人工鼠标移动
  private async humanMouseMove(x: number, y: number): Promise<void> {
    if (!this.page) return

    const steps = 10
    const currentPosition = await this.page.evaluate(() => ({
      x: window.scrollX + window.innerWidth / 2,
      y: window.scrollY + window.innerHeight / 2
    }))

    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const currentX = currentPosition.x + (x - currentPosition.x) * progress
      const currentY = currentPosition.y + (y - currentPosition.y) * progress
      await this.page.mouse.move(currentX, currentY)
      await this.wait(this.randomDelay(HUMAN_SIMULATION.mouseMoveDuration) / steps)
    }
  }

  async launch(): Promise<void> {
    if (this.browser) {
      return
    }

    this.browser = await puppeteer.launch({
      headless: BROWSER_CONFIG.headless,
      defaultViewport: BROWSER_CONFIG.defaultViewport,
      slowMo: BROWSER_CONFIG.slowMo,
      args: BROWSER_CONFIG.args
    })

    // 使用已有的页面，而不是创建新页面
    const pages = await this.browser.pages()
    this.page = pages.length > 0 ? pages[0] : await this.browser.newPage()

    // 设置视口大小
    await this.page.setViewport(BROWSER_CONFIG.defaultViewport)

    this.isConnected = true

    // 监听浏览器断开事件
    this.browser.on('disconnected', () => {
      this.isConnected = false
      this.browser = null
      this.page = null
    })

    // 监听页面事件
    this.page.on('load', () => {
      // 页面加载完成
    })

    this.page.on('error', (error) => {
      // 页面错误处理
    })
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
      this.isConnected = false
    }
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    try {
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
    } catch (error) {
      // 如果是超时但页面已经加载，不抛出错误
      const currentUrl = this.page.url()
      if (currentUrl && currentUrl !== 'about:blank') {
        return
      }
      throw error
    }
  }

  async click(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    // 等待元素出现
    await this.page.waitForSelector(selector, { timeout: 10000 })

    // 获取元素位置
    const element = await this.page.$(selector)
    if (!element) {
      throw new Error(`Element not found: ${selector}`)
    }

    const box = await element.boundingBox()
    if (!box) {
      throw new Error(`Cannot get element position: ${selector}`)
    }

    // 模拟人工移动鼠标到元素位置
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await this.humanMouseMove(x, y)

    // 随机延迟后点击
    await this.wait(this.randomDelay(HUMAN_SIMULATION.clickDelay))
    await this.page.click(selector)
  }

  async clickByText(text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    // 通过文本内容查找元素
    const element = await this.page.evaluateHandle((searchText) => {
      const elements = Array.from(document.querySelectorAll('a, button, input[type="submit"], [role="button"]'))
      for (const el of elements) {
        if (el.textContent?.includes(searchText)) {
          return el
        }
      }
      // 尝试查找包含文本的任意可点击元素
      const allElements = Array.from(document.querySelectorAll('*'))
      for (const el of allElements) {
        if (el.textContent?.includes(searchText) && el.childElementCount === 0) {
          return el
        }
      }
      return null
    }, text)

    if (!element) {
      throw new Error(`Element with text "${text}" not found`)
    }

    await (element as ElementHandle).click()
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    await this.page.waitForSelector(selector, { timeout: 10000 })
    await this.page.focus(selector)

    // 清空现有内容
    await this.page.evaluate((sel) => {
      const input = document.querySelector(sel) as HTMLInputElement
      if (input) input.value = ''
    }, selector)

    // 模拟人工打字
    await this.humanType(text)
  }

  async typeInActiveElement(text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    // 在当前聚焦的元素中输入
    await this.humanType(text)
  }

  async screenshot(fullPage = false): Promise<string> {
    if (!this.page || !this.browser?.isConnected()) {
      throw new Error('Browser not launched')
    }

    try {
      const buffer = await this.page.screenshot({
        fullPage,
        encoding: 'base64'
      }) as string

      return `data:image/png;base64,${buffer}`
    } catch (error) {
      // 如果截图失败，可能是页面已关闭
      this.isConnected = false
      throw error
    }
  }

  async scroll(direction: 'top' | 'bottom'): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    if (direction === 'bottom') {
      await this.page.evaluate(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        })
      })
    } else {
      await this.page.evaluate(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      })
    }

    // 等待滚动完成
    await this.wait(this.randomDelay(HUMAN_SIMULATION.scrollDelay))
  }

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async pressKey(key: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    await this.page.keyboard.press(key as KeyInput)
  }

  async hover(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    await this.page.waitForSelector(selector, { timeout: 10000 })
    await this.page.hover(selector)
  }

  async select(selector: string, value: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    await this.page.waitForSelector(selector, { timeout: 10000 })
    await this.page.select(selector, value)
  }

  async goBack(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    await this.page.goBack()
  }

  async goForward(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    await this.page.goForward()
  }

  async refresh(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched')
    }

    await this.page.reload()
  }

  getStatus(): { isConnected: boolean; url: string; title: string } {
    return {
      isConnected: this.isConnected,
      url: this.page?.url() || '',
      title: ''
    }
  }

  async getTitle(): Promise<string> {
    if (!this.page) return ''
    return await this.page.title()
  }

  getPage(): Page | null {
    return this.page
  }
}
