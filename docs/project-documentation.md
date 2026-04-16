# AI 浏览器自动化 - 项目技术文档

## 目录

1. [项目概述](#项目概述)
2. [项目整体架构](#项目整体架构)
3. [项目使用说明](#项目使用说明)
4. [自动化实现逻辑](#自动化实现逻辑)
5. [进程通信实现逻辑](#进程通信实现逻辑)
6. [进程通信的责任与作用](#进程通信的责任与作用)

---

## 项目概述

本项目是一个基于 Electron 开发的可视化 AI 自动化浏览器工具，允许用户使用简单的自然语言指令驱动本地 Chrome 浏览器执行自动化任务，并模拟真实用户操作行为。

### 核心功能

- 🤖 **自然语言驱动**: 使用简单的中文/英文描述任务，自动解析执行
- 🌐 **本地浏览器控制**: 基于 Puppeteer 控制本地 Chrome 浏览器（可见窗口）
- 👁️ **可视化操作**: 实时预览浏览器截图
- 🔄 **人工模拟**: 模拟真实用户行为，包括鼠标移动、打字延迟等

### 技术栈

| 技术领域 | 技术选型 | 版本/说明 |
|---------|---------|----------|
| 桌面框架 | Electron | 29 |
| 前端框架 | Vue 3 + TypeScript + Vite | - |
| UI 组件库 | Element Plus | - |
| 浏览器自动化 | Puppeteer | - |
| 进程通信 | Electron IPC | - |

---

## 项目整体架构

### 架构分层

项目采用经典的 Electron 主/渲染进程分离架构，分为三层：

```
┌─────────────────────────────────────────────────────┐
│                   渲染进程 (Renderer)               │
│  ┌─────────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  Vue UI     │  │ AI 解析器 │  │  服务封装层   │  │
│  │  (界面)     │  │ (aiParser)│  │(browserService)│
│  └─────────────┘  └───────────┘  └──────────────┘  │
└───────────────────────────┬─────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │  Electron IPC │  ← 通信层
                    └───────┬───────┘
                            │
┌───────────────────────────▼─────────────────────────┐
│                   主进程 (Main)                     │
│  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  IPC 消息处理器  │  │   浏览器控制器         │  │
│  │ (ipc/handlers)   │  │ (browser/controller)   │  │
│  └──────────────────┘  └────────────────────────┘  │
└───────────────────────────┬─────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   Puppeteer   │  ← 浏览器自动化
                    │   Chrome      │
                    └───────────────┘
```

### 目录结构

```
frontend-admin/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 主进程入口
│   │   ├── preload.ts           # 预加载脚本
│   │   ├── browser/
│   │   │   └── controller.ts    # Puppeteer 浏览器控制器
│   │   └── ipc/
│   │       └── handlers.ts      # IPC 消息处理器
│   ├── renderer/                # 渲染进程 (Vue 应用)
│   │   ├── services/
│   │   │   ├── aiParser.ts      # AI 指令解析服务
│   │   │   ├── api.ts           # API 服务
│   │   │   └── browserService.ts # 浏览器服务封装
│   │   └── views/
│   │       └── BrowserView.vue  # 浏览器控制页面
│   └── shared/                  # 共享模块
│       ├── constants/
│       └── types/
└── server/                      # Docker Web 模式服务端
```

### 核心模块关系

1. **主进程 (Main Process)**
   - 负责 Electron 应用生命周期管理
   - 创建和管理 BrowserWindow
   - 初始化 Puppeteer 浏览器控制器
   - 处理来自渲染进程的 IPC 调用

2. **渲染进程 (Renderer Process)**
   - Vue 3 单页应用，提供用户界面
   - 解析自然语言指令
   - 通过 IPC 与主进程通信
   - 支持两种运行模式：Electron 模式和 Web 模式

3. **预加载脚本 (Preload)**
   - 安全的上下文桥接
   - 暴露有限的 API 给渲染进程
   - 白名单机制确保安全性

---

## 项目使用说明

### 运行方式

#### 方式一：Electron 桌面应用（推荐，完整功能）

```bash
cd frontend-admin

# 安装依赖
npm install

# 启动 Electron 桌面应用
npm run dev:electron
```

#### 方式二：Docker Web 模式（功能受限）

```bash
docker-compose up --build -d
# 访问 http://localhost:8081
```

> **注意**: Web 模式仅支持有限功能，推荐使用 Electron 桌面应用以获得完整体验。

### 使用流程

1. **启动浏览器**
   - 点击「启动浏览器」按钮，系统会打开一个由 Puppeteer 控制的 Chrome 浏览器窗口
   - 浏览器窗口可见，可实时观察操作过程

2. **网址导航**
   - 在「网址导航」输入框中输入网址
   - 支持直接输入域名（如 `baidu.com`）或完整 URL
   - 点击「前往」或按回车键导航

3. **自然语言指令**
   - 在「自然语言指令」文本框中输入操作指令
   - 支持多条指令，用换行或句号分隔
   - 点击「执行指令」自动按顺序执行

4. **快捷操作**
   - **📷 截图**: 截取当前浏览器页面
   - **⬆️ 顶部**: 滚动到页面顶部
   - **⬇️ 底部**: 滚动到页面底部

### 支持的指令示例

| 指令类型 | 示例 |
|---------|------|
| 打开网址 | `打开 baidu.com`、`访问 github.com` |
| 搜索 | `搜索 Vue 教程`、`查询人工智能` |
| 点击 | `点击登录按钮`、`click submit` |
| 输入 | `输入 Hello World`、`填写用户名 admin` |
| 等待 | `等待 3 秒`、`wait 5s` |
| 截图 | `截图`、`保存当前页面` |
| 滚动 | `滚动到底部`、`scroll to top` |
| 页面操作 | `刷新页面`、`后退`、`前进` |

---

## 自动化实现逻辑

### 浏览器自动化核心 - Puppeteer

项目使用 Puppeteer 作为浏览器自动化的核心引擎，提供对 Chrome 浏览器的完整控制能力。

#### 浏览器配置

```typescript
// src/main/browser/controller.ts:4-17
const BROWSER_CONFIG = {
  headless: false,  // 显示浏览器窗口，可视化操作
  defaultViewport: {
    width: 1280,
    height: 720
  },
  slowMo: 50,  // 操作延迟，便于观察
  args: [
    '--start-maximized',
    '--disable-infobars',
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
}
```

**设计要点**:
- `headless: false`: 浏览器窗口可见，用户可实时观察
- `slowMo: 50`: 操作间添加延迟，增强可视化效果
- `--start-maximized`: 启动时最大化窗口

### 人工行为模拟 (Human Simulation)

为了更接近真实用户操作，项目实现了多个人工行为模拟机制：

#### 1. 人工打字模拟

```typescript
// src/main/browser/controller.ts:37-44
private async humanType(text: string): Promise<void> {
  for (const char of text) {
    await this.page.keyboard.type(char)
    await this.wait(this.randomDelay(HUMAN_SIMULATION.typingDelay))
  }
}
```

**特性**:
- 逐字符输入，而非一次性填充
- 每个字符间随机延迟 30-100ms
- 模拟真实打字节奏

#### 2. 人工鼠标移动模拟

```typescript
// src/main/browser/controller.ts:47-63
private async humanMouseMove(x: number, y: number): Promise<void> {
  const steps = 10
  // 从当前位置平滑移动到目标位置
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps
    const currentX = currentPosition.x + (x - currentPosition.x) * progress
    const currentY = currentPosition.y + (y - currentPosition.y) * progress
    await this.page.mouse.move(currentX, currentY)
    await this.wait(...)
  }
}
```

**特性**:
- 分 10 步平滑移动鼠标
- 每步之间有随机延迟
- 模拟真实鼠标移动轨迹

#### 3. 人工延迟参数

```typescript
// src/main/browser/controller.ts:19-24
const HUMAN_SIMULATION = {
  typingDelay: { min: 30, max: 100 },      // 打字延迟
  clickDelay: { min: 100, max: 300 },      // 点击前延迟
  mouseMoveDuration: { min: 200, max: 500 }, // 鼠标移动总时长
  scrollDelay: { min: 300, max: 600 }       // 滚动后等待
}
```

### 元素定位策略

项目实现了双重元素定位机制，提高操作成功率：

#### 1. 文本内容定位（优先）

```typescript
// src/main/browser/controller.ts:161-189
async clickByText(text: string): Promise<void> {
  const element = await this.page.evaluateHandle((searchText) => {
    // 先查找常见可点击元素
    const elements = Array.from(document.querySelectorAll('a, button, input[type="submit"], [role="button"]'))
    for (const el of elements) {
      if (el.textContent?.includes(searchText)) {
        return el
      }
    }
    // 兜底：查找包含文本的任何可点击元素
    // ...
  }, text)
}
```

#### 2. CSS 选择器定位（兜底）

```typescript
// src/main/ipc/handlers.ts:58-72
ipcMain.handle('browser:click', async (_event, selector: string) => {
  try {
    await browserController.clickByText(selector)  // 优先文本定位
    return { success: true }
  } catch {
    try {
      await browserController.click(selector)       // 兜底选择器定位
      return { success: true }
    } catch (error) {
      // 错误处理
    }
  }
})
```

### 自然语言指令解析

#### 指令解析流程

```
用户输入文本
    ↓
按 [。\n;；] 分割为多行
    ↓
每行匹配正则模式
    ↓
提取参数并生成 ActionStep
    ↓
返回操作步骤数组
```

#### 模式匹配规则

```typescript
// src/renderer/services/aiParser.ts:5-113
const PATTERNS: Array<{
  regex: RegExp                    // 匹配正则
  type: ActionType                 // 操作类型
  extract: (match) => Params       // 参数提取
  description: (match) => string   // 描述生成
}> = [
  // 打开网址
  { regex: /打开\s*(.+)/i, type: 'navigate', ... },
  // 搜索
  { regex: /搜索\s*(.+)/i, type: 'navigate', ... },
  // 点击
  { regex: /点击\s*(.+)/i, type: 'click', ... },
  // 输入
  { regex: /输入\s*(.+)/i, type: 'type', ... },
  // ... 更多模式
]
```

#### URL 标准化

```typescript
// src/renderer/services/aiParser.ts:116-127
function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.includes('.') && !url.includes(' ')) {
      return `https://${url}`  // 识别为域名
    }
    return `https://www.baidu.com/s?wd=${encodeURIComponent(url)}`  // 识别为搜索词
  }
  return url
}
```

**智能识别**:
- 域名格式（含 `.` 且无空格）→ 自动添加 `https://`
- 其他文本 → 自动转为百度搜索

---

## 进程通信实现逻辑

### Electron IPC 通信机制

项目使用 Electron 的 IPC (Inter-Process Communication) 作为主进程和渲染进程之间的通信桥梁。

### 通信架构

```
┌─────────────────┐          ┌─────────────────┐
│   渲染进程       │          │    主进程        │
│  (Vue 应用)      │          │ (Electron Main) │
└─────────┬───────┘          └───────┬─────────┘
          │                            │
          │  ipcRenderer.invoke()      │
          │ ─────────────────────────> │
          │                            │  处理逻辑
          │                            │  (Puppeteer 操作)
          │  返回结果                  │
          │ <───────────────────────── │
          │                            │
```

### 预加载脚本 - 安全桥接

**文件**: `src/main/preload.ts`

#### 上下文隔离与 API 暴露

```typescript
// src/main/preload.ts:4-52
contextBridge.exposeInMainWorld('electronAPI', {
  // 浏览器控制
  browser: {
    launch: () => ipcRenderer.invoke('browser:launch'),
    close: () => ipcRenderer.invoke('browser:close'),
    navigate: (url: string) => ipcRenderer.invoke('browser:navigate', url),
    click: (selector: string) => ipcRenderer.invoke('browser:click', selector),
    // ... 更多浏览器方法
  },

  // 任务执行
  task: {
    execute: (taskId: string, steps: unknown[]) =>
      ipcRenderer.invoke('task:execute', taskId, steps),
    // ...
  },

  // 事件监听（白名单机制）
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'browser:state-changed',
      'browser:screenshot',
      'task:step-completed',
      // ...
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  }
})
```

**安全设计**:
- 启用 `contextIsolation: true` - 上下文隔离
- 禁用 `nodeIntegration: false` - 不直接暴露 Node.js API
- 白名单机制 - 只允许监听指定频道
- 有限 API 暴露 - 只暴露必要的方法

### IPC 消息处理器

**文件**: `src/main/ipc/handlers.ts`

#### 处理器注册

```typescript
// src/main/ipc/handlers.ts:29-187
export function setupIpcHandlers(ipcMain: IpcMain, browserController: BrowserController) {

  // ───────── 浏览器控制类 IPC ─────────

  ipcMain.handle('browser:launch', async () => {
    try {
      await browserController.launch()
      return { success: true }
    } catch (error) {
      throw new Error(friendlyError(error, '启动浏览器'))
    }
  })

  ipcMain.handle('browser:navigate', async (_event, url: string) => {
    try {
      await browserController.navigate(url)
      return { success: true }
    } catch (error) {
      throw new Error(friendlyError(error, `打开网址 ${url}`))
    }
  })

  // ... 更多浏览器控制方法: click, type, screenshot, scroll 等

  // ───────── 任务执行类 IPC ─────────

  ipcMain.handle('task:execute', async (event, taskId: string, steps: ActionStep[]) => {
    const sender = event.sender

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]

      try {
        // 发送步骤开始事件
        sender.send('task:step-started', { taskId, stepId: step.id, index: i })

        // 执行单个步骤
        await executeStep(browserController, step)

        // 执行后截图
        const screenshot = await browserController.screenshot()

        // 发送步骤完成事件
        sender.send('task:step-completed', {
          taskId,
          stepId: step.id,
          status: 'completed',
          duration: Date.now() - startTime,
          screenshot
        })

      } catch (error) {
        // 错误处理
        sender.send('task:step-completed', {
          taskId,
          stepId: step.id,
          status: 'failed',
          error: errorMsg
        })
        sender.send('task:error', { taskId, error: errorMsg })
        return { success: false, error: errorMsg }
      }
    }

    sender.send('task:completed', { taskId })
    return { success: true }
  })
}
```

#### 步骤执行器

```typescript
// src/main/ipc/handlers.ts:189-240
async function executeStep(controller: BrowserController, step: ActionStep): Promise<void> {
  const { type, params } = step

  switch (type) {
    case 'navigate':
      await controller.navigate(params.url as string)
      break
    case 'click':
      if (params.text) {
        await controller.clickByText(params.text as string)
      } else if (params.selector) {
        await controller.click(params.selector as string)
      }
      break
    case 'type':
      // ...
    case 'scroll':
      // ...
    // ... 更多操作类型
  }
}
```

### 友好错误处理

```typescript
// src/main/ipc/handlers.ts:6-27
function friendlyError(error: unknown, context: string): string {
  const msg = error instanceof Error ? error.message : String(error)

  // 常见错误映射为用户友好提示
  if (msg.includes('not found') || msg.includes('not launched')) {
    return '浏览器未启动，请先点击"启动浏览器"'
  }
  if (msg.includes('timeout') || msg.includes('Timeout')) {
    return `操作超时：${context}，页面可能加载较慢或元素不存在`
  }
  if (msg.includes('Element') && msg.includes('not found')) {
    return `找不到元素"${context}"，请检查页面是否包含该元素`
  }
  if (msg.includes('net::ERR')) {
    return '网络连接失败，请检查网址是否正确'
  }
  // ... 更多错误映射

  return `${context}失败：${msg}`
}
```

### 渲染进程服务封装

**文件**: `src/renderer/services/browserService.ts`

#### 统一服务接口

```typescript
// src/renderer/services/browserService.ts:37-148
class UnifiedBrowserService implements BrowserService {

  private get useElectron(): boolean {
    return isElectron()
  }

  async launch(): Promise<void> {
    if (this.useElectron) {
      await window.electronAPI.browser.launch()  // Electron 模式
    } else {
      await browserApi.launch()                   // Web 模式
    }
  }

  async click(selector: string): Promise<void> {
    if (this.useElectron) {
      await window.electronAPI.browser.click(selector)
    } else {
      throw new Error('Web 模式不支持点击操作')
    }
  }

  // ... 其他方法类似，支持两种模式
}
```

**双模式支持**:
- **Electron 模式**: 使用 IPC 调用主进程（完整功能）
- **Web 模式**: 使用 HTTP API 调用服务器（功能受限）
- 运行时自动检测环境，对外提供统一接口

---

## 进程通信的责任与作用

### 进程通信在项目中的核心责任

#### 1. **安全边界隔离**

**责任**: 在渲染进程（不可信上下文）和主进程（特权上下文）之间建立安全边界。

**实现**:
- 上下文隔离 (`contextIsolation: true`)
- 预加载脚本只暴露有限 API
- 白名单事件监听机制
- 不直接暴露 Node.js API

**意义**: 防止恶意代码通过渲染进程访问系统资源。

#### 2. **浏览器操作代理**

**责任**: 将渲染进程的浏览器操作请求代理到主进程执行。

**操作流**:
```
渲染进程点击"启动浏览器"
        ↓
ipcRenderer.invoke('browser:launch')
        ↓
主进程接收并调用 browserController.launch()
        ↓
Puppeteer 启动 Chrome 浏览器
        ↓
返回 { success: true } 或抛出错误
```

**涉及操作**:
- 浏览器生命周期（启动/关闭）
- 页面导航（前进/后退/刷新）
- 元素交互（点击/输入/悬停）
- 页面操作（截图/滚动）

#### 3. **任务编排与执行**

**责任**: 接收解析后的操作步骤，按序执行，并实时反馈进度。

**执行流程**:

```
渲染进程
    │
    ├─ 1. 解析自然语言 → ActionStep[]
    │
    └─ 2. invoke('task:execute', taskId, steps)
            │
主进程        │
    │        │
    ├─ 3. 循环遍历步骤
    │    │
    │    ├─ 发送 task:step-started 事件
    │    ├─ 执行单个操作（Puppeteer）
    │    ├─ 截取当前屏幕
    │    └─ 发送 task:step-completed 事件（含截图）
    │
    └─ 4. 发送 task:completed 事件
            │
渲染进程    │
    │        │
    └─ 5. UI 更新状态、显示截图
```

#### 4. **状态同步与实时反馈**

**责任**: 在任务执行过程中，实时向渲染进程推送进度更新。

**推送事件类型**:

| 事件频道 | 触发时机 | 携带数据 |
|---------|---------|---------|
| `task:step-started` | 每个步骤开始前 | taskId, stepId, index |
| `task:step-completed` | 每个步骤完成后 | taskId, stepId, status, duration, screenshot / error |
| `task:completed` | 所有步骤完成 | taskId |
| `task:error` | 任务执行出错 | taskId, error |

**UI 表现**:
- 步骤列表高亮当前执行项
- 显示每个步骤的执行耗时
- 实时更新浏览器预览截图
- 失败时显示友好错误信息

#### 5. **跨环境兼容性**

**责任**: 隐藏底层通信差异，对外提供统一的浏览器服务接口。

**两种运行模式对比**:

| 特性 | Electron 模式 | Web 模式 (Docker) |
|-----|-------------|------------------|
| 通信方式 | Electron IPC | HTTP API |
| 浏览器位置 | 本地客户端 | 服务器端 |
| 窗口可见性 | 可见 | 不可见 (headless) |
| 功能完整性 | 完整 | 受限（仅导航、截图） |
| 人工模拟 | 完整 | 无 |

**代码实现**:
```typescript
// 渲染进程无需关心底层实现
await browserService.launch()      // 自动选择 IPC 或 HTTP
await browserService.click('按钮')  // Electron 可用，Web 抛出异常
```

#### 6. **错误封装与用户体验**

**责任**: 将技术错误转换为用户友好的错误信息。

**错误处理流**:
```
Puppeteer 抛出技术错误
        ↓
friendlyError() 函数转换
        ↓
技术信息 → 用户友好提示
        ↓
渲染进程展示给用户
```

**示例转换**:

| 技术错误 | 用户友好提示 |
|---------|-------------|
| `Browser not launched` | 浏览器未启动，请先点击"启动浏览器" |
| `Timeout exceeded` | 操作超时，页面可能加载较慢 |
| `Element not found` | 找不到元素，请检查页面是否包含该元素 |
| `net::ERR_INTERNET_DISCONNECTED` | 网络连接失败，请检查网址是否正确 |

### 进程通信架构总结

```
                    ┌──────────────────────────────────────────┐
                    │          进程通信 (Electron IPC)         │
                    │  整个项目的"中枢神经"和"信息高速公路"    │
                    └─────────────┬────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  安全隔离   │          │  操作代理   │          │  任务编排   │
  │  (边界防护) │          │  (浏览器)   │          │  (执行流)   │
  └─────────────┘          └─────────────┘          └─────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  状态同步   │          │  跨环境兼容 │          │  错误处理   │
  │  (实时反馈) │          │  (双模式)   │          │  (用户友好) │
  └─────────────┘          └─────────────┘          └─────────────┘
```

进程通信层是整个项目的**核心骨架**，它不仅连接了主进程和渲染进程，更承担了安全防护、业务编排、状态管理、用户体验优化等多重关键责任，是架构设计中最重要的组成部分。
