# AI 浏览器自动化 - 项目技术文档

## 目录
1. [项目概述](#项目概述)
2. [项目使用说明](#项目使用说明)
3. [自动化实现逻辑](#自动化实现逻辑)
4. [进程通信实现逻辑](#进程通信实现逻辑)
5. [进程通信的核心责任](#进程通信的核心责任)
6. [项目整体架构](#项目整体架构)

---

## 项目概述

**AI 浏览器自动化** 是一个基于 Electron 开发的可视化自动化浏览器工具，允许用户通过自然语言指令驱动本地浏览器执行任务，并模拟真实用户的操作行为。

### 核心特性
- 🤖 **自然语言驱动**: 使用简单的中文/英文描述任务，自动解析执行
- 🌐 **本地浏览器控制**: 基于 Puppeteer 控制本地 Chrome 浏览器（可见窗口）
- 👁️ **可视化操作**: 实时预览浏览器截图
- 🔄 **人工模拟**: 模拟真实用户行为，包括鼠标移动、打字延迟等

---

## 项目使用说明

### 环境要求
- Node.js >= 16.x
- npm 或 yarn
- Chrome 浏览器（由 Puppeteer 自动下载）

### 安装与运行

#### 1. Electron 桌面应用（推荐，完整功能）

```bash
cd frontend-admin

# 安装依赖
npm install

# 启动 Electron 桌面应用
npm run dev:electron
```

#### 2. Docker 方式运行（Web 模式，功能受限）

```bash
docker-compose up --build -d
# 访问 http://localhost:8081
```

### 构建打包

```bash
# 构建所有平台
npm run dist

# 仅构建目录（不打包）
npm run pack
```

### 使用流程

1. **启动浏览器**: 点击「启动浏览器」按钮，打开由 Puppeteer 控制的 Chrome 浏览器窗口
2. **网址导航**: 在「网址导航」输入框中输入网址，点击「前往」导航到目标页面
3. **页面预览**: 右侧预览区域会显示当前页面的截图
4. **执行指令**: 在「自然语言指令」输入框中输入操作指令，点击「执行指令」自动执行
5. **快捷操作**: 使用「快捷操作」按钮可以快速截图、滚动页面

### 支持的指令示例

```
打开百度搜索Vue教程
访问 github.com
点击登录按钮
在输入框中输入Hello World
等待3秒后截图
滚动到页面底部
刷新页面
返回上一页
```

---

## 自动化实现逻辑

### 1. 浏览器控制核心 (`BrowserController`)

位置: `frontend-admin/src/main/browser/controller.ts`

#### 浏览器配置

```typescript
const BROWSER_CONFIG = {
  headless: false,  // 显示浏览器窗口
  defaultViewport: { width: 1280, height: 720 },
  slowMo: 50,
  args: [
    '--start-maximized',
    '--disable-infobars',
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
}
```

#### 人工行为模拟

系统内置了完整的人工行为模拟机制：

```typescript
const HUMAN_SIMULATION = {
  typingDelay: { min: 30, max: 100 },        // 打字延迟
  clickDelay: { min: 100, max: 300 },        // 点击前延迟
  mouseMoveDuration: { min: 200, max: 500 }, // 鼠标移动耗时
  scrollDelay: { min: 300, max: 600 }        // 滚动等待延迟
}
```

#### 核心方法实现

**模拟人工打字**:
```typescript
private async humanType(text: string): Promise<void> {
  for (const char of text) {
    await this.page.keyboard.type(char)
    await this.wait(this.randomDelay(HUMAN_SIMULATION.typingDelay))
  }
}
```

**模拟人工鼠标移动**:
```typescript
private async humanMouseMove(x: number, y: number): Promise<void> {
  const steps = 10
  // 分段移动，模拟平滑的鼠标轨迹
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps
    const currentX = currentPosition.x + (x - currentPosition.x) * progress
    const currentY = currentPosition.y + (y - currentPosition.y) * progress
    await this.page.mouse.move(currentX, currentY)
    await this.wait(...)
  }
}
```

#### 支持的自动化操作

| 操作类型 | 说明 | 实现方式 |
|---------|------|---------|
| `navigate` | 页面导航 | `page.goto()` |
| `click` | 元素点击 | 先通过文本查找，再通过选择器 |
| `type` | 文本输入 | 模拟人工逐字输入 |
| `scroll` | 页面滚动 | `window.scrollTo({ behavior: 'smooth' })` |
| `wait` | 等待延迟 | `setTimeout` |
| `screenshot` | 页面截图 | `page.screenshot()` |
| `hover` | 元素悬停 | `page.hover()` |
| `select` | 下拉选择 | `page.select()` |
| `press` | 键盘按键 | `page.keyboard.press()` |
| `refresh` | 页面刷新 | `page.reload()` |
| `back` | 页面后退 | `page.goBack()` |
| `forward` | 页面前进 | `page.goForward()` |

### 2. 自然语言解析 (`aiParser`)

位置: `frontend-admin/src/renderer/services/aiParser.ts`

#### 模式匹配机制

系统使用正则表达式模式匹配来解析自然语言指令：

```typescript
const PATTERNS = [
  {
    regex: /(?:打开|访问|进入|跳转到?)\s*(.+?)$/i,
    type: 'navigate',
    extract: (match) => ({ url: normalizeUrl(match[1].trim()) }),
    description: (match) => `打开网址: ${match[1].trim()}`
  },
  // ... 更多模式
]
```

#### 指令解析流程

1. **分割指令**: 按换行或句号分割多条指令
2. **模式匹配**: 逐条匹配预定义的正则表达式
3. **参数提取**: 从匹配结果中提取参数并标准化
4. **生成步骤**: 创建 `ActionStep` 对象数组

#### URL 标准化

```typescript
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

---

## 进程通信实现逻辑

### Electron 进程模型

Electron 采用**多进程架构**：

1. **主进程 (Main Process)**:
   - 负责创建和管理浏览器窗口
   - 拥有完整的 Node.js API 访问权限
   - 运行 Puppeteer 浏览器控制逻辑

2. **渲染进程 (Renderer Process)**:
   - 运行 Vue 前端应用
   - 负责用户界面展示和交互
   - 通过预加载脚本与主进程通信

### IPC 通信架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        渲染进程 (Vue)                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────┐ │
│  │ BrowserView.vue │───▶│ browserService  │───▶│ preload │ │
│  │   (UI 界面)     │    │   (服务层)      │    │  (桥接) │ │
│  └─────────────────┘    └─────────────────┘    └─────┬───┘ │
└───────────────────────────────────────────────────────│─────┘
                                                        │
                                            IPC Channel (invoke/on)
                                                        │
┌───────────────────────────────────────────────────────│─────┐
│                        主进程                          │     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────▼───┐ │
│  │ BrowserController │◀──│  handlers.ts    │◀──│ ipcMain │ │
│  │  (Puppeteer 控制) │    │ (IPC 处理器)   │    │         │ │
│  └─────────────────┘    └─────────────────┘    └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 通信机制实现

#### 1. 预加载脚本 (Context Bridge)

位置: `frontend-admin/src/main/preload.ts`

使用 Electron 的 `contextBridge` 安全地暴露 API：

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  browser: {
    launch: () => ipcRenderer.invoke('browser:launch'),
    close: () => ipcRenderer.invoke('browser:close'),
    navigate: (url: string) => ipcRenderer.invoke('browser:navigate', url),
    // ... 更多方法
  },
  task: {
    execute: (taskId: string, steps: unknown[]) =>
      ipcRenderer.invoke('task:execute', taskId, steps),
    // ... 更多方法
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  }
})
```

**安全特性**:
- ✅ 禁用 `nodeIntegration`
- ✅ 启用 `contextIsolation`
- ✅ 白名单验证 Channel
- ✅ 仅暴露必要的 API

#### 2. 主进程 IPC 处理器

位置: `frontend-admin/src/main/ipc/handlers.ts`

**双向通信 (Invoke/Handle)**:

```typescript
export function setupIpcHandlers(ipcMain: IpcMain, browserController: BrowserController) {
  // 浏览器控制
  ipcMain.handle('browser:launch', async () => {
    try {
      await browserController.launch()
      return { success: true }
    } catch (error) {
      throw new Error(friendlyError(error, '启动浏览器'))
    }
  })

  ipcMain.handle('browser:navigate', async (_event, url: string) => {
    await browserController.navigate(url)
    return { success: true }
  })

  // ... 更多 handle 注册
}
```

**事件推送 (Send/On)**:

```typescript
ipcMain.handle('task:execute', async (event, taskId: string, steps: ActionStep[]) => {
  const sender = event.sender

  for (let i = 0; i < steps.length; i++) {
    // 步骤开始事件
    sender.send('task:step-started', { taskId, stepId: step.id, index: i })

    try {
      await executeStep(browserController, step)
      const screenshot = await browserController.screenshot()

      // 步骤完成事件
      sender.send('task:step-completed', {
        taskId,
        stepId: step.id,
        status: 'completed',
        duration: Date.now() - startTime,
        screenshot
      })
    } catch (error) {
      // 步骤失败事件
      sender.send('task:step-completed', {
        taskId,
        stepId: step.id,
        status: 'failed',
        error: errorMsg
      })
    }
  }

  sender.send('task:completed', { taskId })
})
```

#### 3. 服务层封装

位置: `frontend-admin/src/renderer/services/browserService.ts`

**环境适配策略**:

```typescript
class UnifiedBrowserService implements BrowserService {
  private get useElectron(): boolean {
    return isElectron()
  }

  async launch(): Promise<void> {
    if (this.useElectron) {
      await window.electronAPI!.browser.launch()
    } else {
      await browserApi.launch()  // Web 模式，HTTP API
    }
  }

  async click(selector: string): Promise<void> {
    if (this.useElectron) {
      await window.electronAPI!.browser.click(selector)
    } else {
      throw new Error('Web 模式不支持点击操作')
    }
  }
}
```

### IPC 通信通道清单

#### 请求-响应通道 (Invoke/Handle)

| Channel | 方向 | 参数 | 返回值 | 说明 |
|---------|------|------|--------|------|
| `browser:launch` | Renderer → Main | 无 | `{ success: boolean }` | 启动浏览器 |
| `browser:close` | Renderer → Main | 无 | `{ success: boolean }` | 关闭浏览器 |
| `browser:navigate` | Renderer → Main | `url: string` | `{ success: boolean }` | 导航到网址 |
| `browser:click` | Renderer → Main | `selector: string` | `{ success: boolean }` | 点击元素 |
| `browser:type` | Renderer → Main | `selector, text` | `{ success: boolean }` | 输入文字 |
| `browser:screenshot` | Renderer → Main | 无 | `{ success, image }` | 页面截图 |
| `browser:scroll` | Renderer → Main | `direction` | `{ success: boolean }` | 滚动页面 |
| `browser:wait` | Renderer → Main | `ms: number` | `{ success: boolean }` | 等待延迟 |
| `browser:status` | Renderer → Main | 无 | `{ isConnected, url, title }` | 获取状态 |
| `browser:back` | Renderer → Main | 无 | `{ success: boolean }` | 页面后退 |
| `browser:forward` | Renderer → Main | 无 | `{ success: boolean }` | 页面前进 |
| `browser:refresh` | Renderer → Main | 无 | `{ success: boolean }` | 页面刷新 |
| `task:execute` | Renderer → Main | `taskId, steps` | `{ success }` | 执行任务 |
| `task:pause` | Renderer → Main | `taskId` | `{ success }` | 暂停任务 |
| `task:resume` | Renderer → Main | `taskId` | `{ success }` | 恢复任务 |
| `task:stop` | Renderer → Main | `taskId` | `{ success }` | 停止任务 |

#### 事件推送通道 (Send/On)

| Channel | 方向 | 触发时机 | 数据内容 |
|---------|------|----------|----------|
| `task:step-started` | Main → Renderer | 任务步骤开始时 | `{ taskId, stepId, index }` |
| `task:step-completed` | Main → Renderer | 任务步骤完成时 | `{ taskId, stepId, status, duration, screenshot?, error? }` |
| `task:completed` | Main → Renderer | 全部任务完成时 | `{ taskId }` |
| `task:error` | Main → Renderer | 任务出错时 | `{ taskId, error }` |
| `browser:state-changed` | Main → Renderer | 浏览器状态变化 | `{ isConnected, url }` |
| `log:message` | Main → Renderer | 日志输出 | `{ level, message }` |

---

## 进程通信的核心责任

### 1. 安全边界隔离

**问题**: 渲染进程运行在沙箱环境中，无法直接访问系统资源和 Node.js API。

**解决方案**: IPC 作为唯一的安全通道，通过预加载脚本的 Context Bridge 暴露有限的 API。

**实现要点**:
- 禁用 `nodeIntegration`，防止前端代码直接调用 Node.js API
- 启用 `contextIsolation`，确保渲染进程无法访问 Electron 内部对象
- 白名单机制验证 Channel，防止非法通信
- 参数类型检查，防止恶意输入

### 2. 异步操作编排

**问题**: 浏览器自动化操作是异步的，需要顺序执行并反馈状态。

**解决方案**: IPC 提供了 `invoke/handle` 的 Promise 化异步调用机制，结合事件推送实现进度反馈。

**实现流程**:
```
1. 前端调用 electronAPI.browser.navigate(url)
   ↓
2. ipcRenderer.invoke('browser:navigate', url)
   ↓
3. 主进程 ipcMain.handle 接收，调用 browserController.navigate(url)
   ↓
4. Puppeteer 执行页面导航（异步）
   ↓
5. 返回 Promise 结果到渲染进程
   ↓
6. 前端更新 UI 状态
```

### 3. 任务执行的实时反馈

**问题**: 多步骤任务需要实时反馈执行进度，不能等待全部完成才返回。

**解决方案**: 主进程在任务执行过程中通过 `sender.send()` 主动推送进度事件。

```
执行任务前
    ↓
发送 task:step-started
    ↓
执行单个步骤
    ↓
发送 task:step-completed (成功/失败)
    ↓
执行下一个步骤
    ↓
...
    ↓
发送 task:completed
```

### 4. 跨环境统一接口

**问题**: 项目需要同时支持 Electron 桌面模式和 Web 服务器模式。

**解决方案**: 服务层封装统一接口，运行时检测环境选择通信方式。

```typescript
// 统一接口，调用方无需关心底层实现
interface BrowserService {
  launch(): Promise<void>
  navigate(url: string): Promise<void>
  click(selector: string): Promise<void>
  // ...
}

// Electron 模式: IPC 通信
// Web 模式: HTTP API 调用
```

### 5. 错误友好处理

**问题**: 底层错误信息技术性强，用户难以理解。

**解决方案**: IPC 处理器层进行错误转换，提供友好的用户提示。

```typescript
function friendlyError(error: unknown, context: string): string {
  const msg = error instanceof Error ? error.message : String(error)

  if (msg.includes('not found') || msg.includes('not launched')) {
    return '浏览器未启动，请先点击"启动浏览器"'
  }
  if (msg.includes('timeout') || msg.includes('Timeout')) {
    return `操作超时：${context}，页面可能加载较慢或元素不存在`
  }
  // ... 更多错误映射

  return `${context}失败：${msg}`
}
```

### 6. 资源生命周期管理

**问题**: 浏览器实例需要与应用窗口生命周期同步。

**解决方案**: 主进程监听窗口事件，在适当时候创建/销毁浏览器控制器。

```typescript
app.on('window-all-closed', async () => {
  // 关闭浏览器
  if (browserController) {
    await browserController.close()
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

---

## 项目整体架构

### 架构分层图

```
┌─────────────────────────────────────────────────────────────────┐
│                        表现层 (Presentation)                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     BrowserView.vue                     │   │
│  │  浏览器控制 UI │ 指令输入 │ 截图预览 │ 状态显示        │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────┬──────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────┐
│                      服务层 (Service Layer)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ browserService  │  │   aiParser.ts   │  │     api.ts      │  │
│  │  浏览器服务封装 │  │  自然语言解析   │  │  HTTP API 封装  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      桥接层 (Bridge Layer)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                       preload.ts                        │   │
│  │  ContextBridge │ IPC Channel 封装 │ 类型声明            │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
           ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 进程边界
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      业务层 (Business Layer)                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     handlers.ts                         │   │
│  │  IPC 处理器注册 │ 任务执行编排 │ 错误友好化             │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      控制层 (Controller Layer)                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  BrowserController                      │   │
│  │  Puppeteer 封装 │ 人工行为模拟 │ 浏览器生命周期管理      │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      基础设施层 (Infrastructure)                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Electron 29   │  │   Puppeteer 22  │  │   Vue 3 + TS    │  │
│  │  桌面应用框架   │  │  浏览器自动化   │  │  前端框架        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 目录结构详解

```
frontend-admin/
├── src/
│   ├── main/                          # 主进程代码 (Electron Main)
│   │   ├── index.ts                   # 主进程入口
│   │   │    - 创建 BrowserWindow
│   │   │    - 初始化 BrowserController
│   │   │    - 注册 IPC 处理器
│   │   │    - 应用生命周期管理
│   │   │
│   │   ├── preload.ts                 # 预加载脚本
│   │   │    - ContextBridge API 暴露
│   │   │    - IPC Channel 白名单
│   │   │    - TypeScript 类型声明
│   │   │
│   │   ├── browser/
│   │   │   └── controller.ts          # 浏览器控制器
│   │   │        - Puppeteer 封装
│   │   │        - 人工行为模拟
│   │   │        - 浏览器操作方法
│   │   │
│   │   └── ipc/
│   │       └── handlers.ts            # IPC 消息处理器
│   │            - 浏览器控制 Handler
│   │            - 任务执行 Handler
│   │            - 错误友好处理
│   │
│   ├── renderer/                      # 渲染进程代码 (Vue App)
│   │   ├── main.ts                    # Vue 应用入口
│   │   ├── App.vue                    # 根组件
│   │   ├── router/
│   │   │   └── index.ts               # 路由配置
│   │   ├── views/
│   │   │   └── BrowserView.vue        # 浏览器控制页面
│   │   │        - 浏览器控制 UI
│   │   │        - 指令输入界面
│   │   │        - 截图预览
│   │   │
│   │   ├── services/
│   │   │   ├── browserService.ts      # 浏览器服务封装
│   │   │   │    - 统一接口定义
│   │   │   │    - 环境检测与适配
│   │   │   │    - Electron/Web 双模式
│   │   │   │
│   │   │   ├── aiParser.ts            # 自然语言解析
│   │   │   │    - 正则表达式模式匹配
│   │   │   │    - 指令解析与标准化
│   │   │   │    - ActionStep 生成
│   │   │   │
│   │   │   └── api.ts                 # HTTP API 封装 (Web 模式)
│   │   │
│   │   └── utils/
│   │       └── format.ts              # 工具函数
│   │
│   └── shared/                        # 共享模块
│       ├── constants/
│       │   └── index.ts               # 常量定义
│       └── types/
│           └── index.ts               # 类型定义
│                - BrowserState
│                - ActionStep
│                - ActionType
│
├── server/                            # Web 模式服务端 (Docker)
│   ├── index.js                       # Express 服务
│   └── services/
│       ├── browser.js                 # 浏览器服务
│       └── task.js                    # 任务服务
│
├── package.json                       # 项目配置
├── vite.config.ts                     # Vite 构建配置
├── tsconfig.json                      # TypeScript 配置
└── Dockerfile                         # Docker 镜像配置
```

### 核心数据流

#### 单步操作数据流

```
用户点击"启动浏览器"按钮
    ↓
BrowserView.vue: launchBrowser()
    ↓
browserService.launch()
    ↓
[环境检测: Electron 模式]
    ↓
window.electronAPI.browser.launch()
    ↓
ipcRenderer.invoke('browser:launch')
    ↓
━━━━━━━━━━━━━━━━━━ 进程边界 ━━━━━━━━━━━━━━━━━━
    ↓
ipcMain.handle('browser:launch')
    ↓
browserController.launch()
    ↓
puppeteer.launch(BROWSER_CONFIG)
    ↓
返回 { success: true }
    ↓
━━━━━━━━━━━━━━━━━━ 进程边界 ━━━━━━━━━━━━━━━━━━
    ↓
Promise resolve
    ↓
isConnected.value = true
    ↓
UI 更新: 显示"浏览器已连接"
```

#### 自然语言指令执行数据流

```
用户输入: "打开百度搜索Vue教程"
    ↓
executeCommand()
    ↓
parseNaturalLanguage(command)
    │
    ├─ 按换行分割指令
    ├─ 正则模式匹配
    └─ 生成 ActionStep 数组:
       [
         { type: 'navigate', params: { url: 'https://www.baidu.com/s?wd=Vue教程' } }
       ]
    ↓
遍历 steps 数组
    ↓
browserService.navigate(url)
    ↓
[IPC 通信]
    ↓
browserController.navigate(url)
    ↓
puppeteer page.goto()
    ↓
refreshScreenshot()
    ↓
更新页面截图预览
    ↓
ElMessage.success('指令执行完成')
```

### 技术选型分析

| 技术 | 选型理由 | 替代方案 |
|------|---------|---------|
| **Electron 29** | 跨平台桌面应用，成熟的生态，Node.js + Chromium 双进程架构 | NW.js, Tauri |
| **Vue 3 + TypeScript** | 响应式框架，类型安全，开发效率高 | React, Angular, Svelte |
| **Puppeteer 22** | Google 官方维护，API 完善，Chrome DevTools Protocol | Playwright, Selenium |
| **Vite** | 极速开发体验，ESM 原生支持，热更新快 | Webpack, Rollup |
| **Element Plus** | Vue 3 官方推荐 UI 库，组件丰富 | Ant Design Vue, Naive UI |

### 设计决策权衡

#### 1. 可见浏览器 vs 无头浏览器

**决策**: 使用 `headless: false` 可见浏览器

**理由**:
- ✅ 用户可以看到浏览器操作过程，增加信任感
- ✅ 便于调试和问题排查
- ✅ 某些网站检测不到自动化工具
- ❌ 资源占用更高
- ❌ 不适合服务器无人值守运行

#### 2. 人工行为模拟

**决策**: 实现打字延迟、鼠标移动轨迹、随机等待

**理由**:
- ✅ 避免被网站的反爬虫机制检测
- ✅ 更接近真实用户行为
- ✅ 操作过程更自然
- ❌ 执行速度变慢

#### 3. 正则解析 vs AI 解析

**决策**: 使用正则表达式模式匹配

**理由**:
- ✅ 无需 API Key，完全离线运行
- ✅ 响应速度快，无延迟
- ✅ 确定性结果，可预测
- ❌ 理解能力有限，复杂指令无法处理
- ❌ 需要维护大量模式规则

#### 4. IPC 通信 vs 直接调用

**决策**: 通过 IPC 通道隔离渲染进程和主进程

**理由**:
- ✅ 遵循 Electron 安全最佳实践
- ✅ 前后端分离，职责清晰
- ✅ 便于未来扩展 Web 模式
- ❌ 增加了一层抽象，代码复杂度上升
- ❌ 调试难度增加

---

## 总结

本项目是一个典型的 **Electron + Puppeteer** 自动化工具架构，通过 **IPC 进程通信** 实现了安全的前后端分离，结合 **自然语言解析** 和 **人工行为模拟**，为用户提供了直观、易用的浏览器自动化体验。

**核心价值**:
1. **低门槛**: 无需编程知识，用自然语言就能驱动浏览器自动化
2. **可视化**: 实时预览操作过程，所见即所得
3. **安全性**: 严格的进程隔离，遵循安全最佳实践
4. **可扩展**: 分层架构设计，便于添加新功能和支持新平台
