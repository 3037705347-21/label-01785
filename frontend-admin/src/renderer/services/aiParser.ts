import type { ActionStep, ActionType } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'

// 指令模式匹配规则
const PATTERNS: Array<{
  regex: RegExp
  type: ActionType
  extract: (match: RegExpMatchArray) => Record<string, unknown>
  description: (match: RegExpMatchArray) => string
}> = [
  // 打开/访问网址
  {
    regex: /(?:打开|访问|进入|跳转到?|go\s*to|open|visit|navigate\s*to)\s*(?:网址|网站|页面|url)?\s*[：:"]?\s*(.+?)(?:["""]|$)/i,
    type: 'navigate',
    extract: (match) => ({ url: normalizeUrl(match[1].trim()) }),
    description: (match) => `打开网址: ${match[1].trim()}`
  },
  // 搜索
  {
    regex: /(?:在?(?:百度|谷歌|google|bing|搜索引擎)?(?:上|中)?)?(?:搜索|查找|查询|search)\s*[：:]?\s*[""]?(.+?)[""]?$/i,
    type: 'navigate',
    extract: (match) => ({
      url: `https://www.baidu.com/s?wd=${encodeURIComponent(match[1].trim())}`
    }),
    description: (match) => `搜索: ${match[1].trim()}`
  },
  // 点击
  {
    regex: /(?:点击|单击|按下?|click|tap|press)\s*(?:一下)?\s*[：:]?\s*[""]?(.+?)[""]?$/i,
    type: 'click',
    extract: (match) => ({ selector: match[1].trim(), text: match[1].trim() }),
    description: (match) => `点击: ${match[1].trim()}`
  },
  // 输入文字
  {
    regex: /(?:在?(?:输入框|文本框|搜索框)?(?:中|里)?)?(?:输入|填写|键入|type|input|enter)\s*[：:]?\s*[""]?(.+?)[""]?$/i,
    type: 'type',
    extract: (match) => ({ text: match[1].trim() }),
    description: (match) => `输入文字: ${match[1].trim()}`
  },
  // 等待
  {
    regex: /(?:等待|暂停|延迟|wait|delay|sleep)\s*(\d+)\s*(?:秒|s|seconds?)?/i,
    type: 'wait',
    extract: (match) => ({ duration: parseInt(match[1]) * 1000 }),
    description: (match) => `等待 ${match[1]} 秒`
  },
  // 截图
  {
    regex: /(?:截图|截屏|保存?(?:当前)?页面|screenshot|capture)/i,
    type: 'screenshot',
    extract: () => ({ fullPage: false }),
    description: () => '截取当前页面'
  },
  // 滚动到底部
  {
    regex: /(?:滚动|scroll)\s*(?:到|至)?\s*(?:页面)?(?:底部|最下面|bottom)/i,
    type: 'scroll',
    extract: () => ({ direction: 'bottom' }),
    description: () => '滚动到页面底部'
  },
  // 滚动到顶部
  {
    regex: /(?:滚动|scroll)\s*(?:到|至)?\s*(?:页面)?(?:顶部|最上面|top)/i,
    type: 'scroll',
    extract: () => ({ direction: 'top' }),
    description: () => '滚动到页面顶部'
  },
  // 刷新
  {
    regex: /(?:刷新|重新加载|reload|refresh)/i,
    type: 'refresh',
    extract: () => ({}),
    description: () => '刷新页面'
  },
  // 后退
  {
    regex: /(?:后退|返回|go\s*back|back)/i,
    type: 'back',
    extract: () => ({}),
    description: () => '返回上一页'
  },
  // 前进
  {
    regex: /(?:前进|go\s*forward|forward)/i,
    type: 'forward',
    extract: () => ({}),
    description: () => '前进到下一页'
  },
  // 悬停
  {
    regex: /(?:悬停|hover|鼠标移动?到?)\s*(?:在|到)?\s*[：:]?\s*[""]?(.+?)[""]?$/i,
    type: 'hover',
    extract: (match) => ({ selector: match[1].trim(), text: match[1].trim() }),
    description: (match) => `悬停在: ${match[1].trim()}`
  },
  // 选择下拉选项
  {
    regex: /(?:选择|select)\s*[：:]?\s*[""]?(.+?)[""]?$/i,
    type: 'select',
    extract: (match) => ({ value: match[1].trim() }),
    description: (match) => `选择: ${match[1].trim()}`
  },
  // 按键
  {
    regex: /(?:按|press)\s*(?:下)?\s*(enter|回车|tab|esc|escape|空格|space)/i,
    type: 'press',
    extract: (match) => ({
      key: normalizeKey(match[1].trim())
    }),
    description: (match) => `按下按键: ${match[1].trim()}`
  }
]

// URL 标准化
function normalizeUrl(url: string): string {
  url = url.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // 检查是否是域名格式
    if (url.includes('.') && !url.includes(' ')) {
      return `https://${url}`
    }
    // 否则当作搜索词
    return `https://www.baidu.com/s?wd=${encodeURIComponent(url)}`
  }
  return url
}

// 按键标准化
function normalizeKey(key: string): string {
  const keyMap: Record<string, string> = {
    '回车': 'Enter',
    'enter': 'Enter',
    '空格': 'Space',
    'space': 'Space',
    'tab': 'Tab',
    'esc': 'Escape',
    'escape': 'Escape'
  }
  return keyMap[key.toLowerCase()] || key
}

// 解析自然语言为操作步骤
export function parseNaturalLanguage(text: string): ActionStep[] {
  const steps: ActionStep[] = []

  // 按换行或句号分割
  const lines = text
    .split(/[。\n;；]/)
    .map(line => line.trim())
    .filter(line => line.length > 0)

  for (const line of lines) {
    let matched = false

    for (const pattern of PATTERNS) {
      const match = line.match(pattern.regex)
      if (match) {
        steps.push({
          id: uuidv4(),
          type: pattern.type,
          description: pattern.description(match),
          params: pattern.extract(match),
          status: 'pending'
        })
        matched = true
        break
      }
    }

    // 如果没有匹配到任何模式，尝试智能推断
    if (!matched && line.length > 0) {
      // 默认当作导航或搜索
      if (line.includes('http') || line.includes('www.') || line.includes('.com')) {
        steps.push({
          id: uuidv4(),
          type: 'navigate',
          description: `打开: ${line}`,
          params: { url: normalizeUrl(line) },
          status: 'pending'
        })
      }
    }
  }

  return steps
}

// 生成操作描述
export function generateStepDescription(step: ActionStep): string {
  return step.description
}
