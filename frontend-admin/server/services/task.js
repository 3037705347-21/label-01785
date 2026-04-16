const { v4: uuidv4 } = require('uuid')

class TaskService {
  constructor(browserService) {
    this.browserService = browserService
    this.tasks = new Map()
    this.broadcast = null
  }

  setBroadcast(fn) {
    this.broadcast = fn
  }

  createTask(name, naturalLanguage) {
    const steps = this.parseNaturalLanguage(naturalLanguage)

    const task = {
      id: uuidv4(),
      name,
      description: naturalLanguage,
      naturalLanguage,
      steps,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    this.tasks.set(task.id, task)
    return task
  }

  parseNaturalLanguage(text) {
    const steps = []
    const patterns = [
      {
        regex: /(?:打开|访问|进入|跳转到?|go\s*to|open|visit|navigate\s*to)\s*(?:网址|网站|页面|url)?\s*[：:"]?\s*(.+?)(?:["""]|$)/i,
        type: 'navigate',
        extract: (match) => ({ url: this.normalizeUrl(match[1].trim()) }),
        description: (match) => `打开网址: ${match[1].trim()}`
      },
      {
        regex: /(?:在?(?:百度|谷歌|google|bing)?(?:上|中)?)?(?:搜索|查找|查询|search)\s*[：:]?\s*[""]?(.+?)[""]?$/i,
        type: 'navigate',
        extract: (match) => ({ url: `https://www.baidu.com/s?wd=${encodeURIComponent(match[1].trim())}` }),
        description: (match) => `搜索: ${match[1].trim()}`
      },
      {
        regex: /(?:点击|单击|按下?|click|tap|press)\s*(?:一下)?\s*[：:]?\s*[""]?(.+?)[""]?$/i,
        type: 'click',
        extract: (match) => ({ selector: match[1].trim(), text: match[1].trim() }),
        description: (match) => `点击: ${match[1].trim()}`
      },
      {
        regex: /(?:在?(?:输入框|文本框|搜索框)?(?:中|里)?)?(?:输入|填写|键入|type|input|enter)\s*[：:]?\s*[""]?(.+?)[""]?$/i,
        type: 'type',
        extract: (match) => ({ text: match[1].trim() }),
        description: (match) => `输入文字: ${match[1].trim()}`
      },
      {
        regex: /(?:等待|暂停|延迟|wait|delay|sleep)\s*(\d+)\s*(?:秒|s|seconds?)?/i,
        type: 'wait',
        extract: (match) => ({ duration: parseInt(match[1]) * 1000 }),
        description: (match) => `等待 ${match[1]} 秒`
      },
      {
        regex: /(?:截图|截屏|保存?(?:当前)?页面|screenshot|capture)/i,
        type: 'screenshot',
        extract: () => ({ fullPage: false }),
        description: () => '截取当前页面'
      },
      {
        regex: /(?:滚动|scroll)\s*(?:到|至)?\s*(?:页面)?(?:底部|最下面|bottom)/i,
        type: 'scroll',
        extract: () => ({ direction: 'bottom' }),
        description: () => '滚动到页面底部'
      },
      {
        regex: /(?:滚动|scroll)\s*(?:到|至)?\s*(?:页面)?(?:顶部|最上面|top)/i,
        type: 'scroll',
        extract: () => ({ direction: 'top' }),
        description: () => '滚动到页面顶部'
      },
      {
        regex: /(?:刷新|重新加载|reload|refresh)/i,
        type: 'refresh',
        extract: () => ({}),
        description: () => '刷新页面'
      }
    ]

    const lines = text.split(/[。\n;；]/).map(line => line.trim()).filter(line => line.length > 0)

    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern.regex)
        if (match) {
          steps.push({
            id: uuidv4(),
            type: pattern.type,
            description: pattern.description(match),
            params: pattern.extract(match),
            status: 'pending'
          })
          break
        }
      }
    }

    return steps
  }

  normalizeUrl(url) {
    url = url.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        return `https://${url}`
      }
      return `https://www.baidu.com/s?wd=${encodeURIComponent(url)}`
    }
    return url
  }

  getTask(id) {
    return this.tasks.get(id)
  }

  getAllTasks() {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  async executeTask(taskId) {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error('Task not found')
    }

    task.status = 'running'
    task.updatedAt = Date.now()
    this.notifyTaskUpdate(task)

    try {
      for (const step of task.steps) {
        step.status = 'running'
        this.notifyTaskUpdate(task)

        const startTime = Date.now()

        try {
          await this.executeStep(step)
          step.status = 'completed'
          step.duration = Date.now() - startTime

          // 截图
          try {
            step.screenshot = await this.browserService.screenshot()
          } catch (e) {
            // 忽略截图错误
          }
        } catch (error) {
          step.status = 'failed'
          step.error = error.message
          step.duration = Date.now() - startTime
          throw error
        }

        this.notifyTaskUpdate(task)
      }

      task.status = 'completed'
      task.completedAt = Date.now()
    } catch (error) {
      task.status = 'failed'
      task.error = error.message
    }

    task.updatedAt = Date.now()
    this.notifyTaskUpdate(task)
  }

  async executeStep(step) {
    const { type, params } = step

    switch (type) {
      case 'navigate':
        await this.browserService.navigate(params.url)
        break
      case 'click':
        await this.browserService.click(params.selector || params.text)
        break
      case 'type':
        await this.browserService.type(params.selector || 'input', params.text)
        break
      case 'scroll':
        await this.browserService.scroll(params.direction)
        break
      case 'wait':
        await this.browserService.wait(params.duration)
        break
      case 'screenshot':
        await this.browserService.screenshot(params.fullPage)
        break
      case 'refresh':
        await this.browserService.page?.reload()
        break
      default:
        throw new Error(`Unknown action type: ${type}`)
    }
  }

  deleteTask(id) {
    this.tasks.delete(id)
  }

  notifyTaskUpdate(task) {
    if (this.broadcast) {
      this.broadcast('task_update', {
        taskId: task.id,
        status: task.status,
        task
      })
    }
  }
}

module.exports = { TaskService }
