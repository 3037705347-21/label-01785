# AI浏览器自动化平台 - 项目文档

## 1. 项目简介

**AI浏览器自动化平台**是一个基于Electron + Vue 3 + Puppeteer的可视化自动化工具，允许用户通过自然语言或可视化操作驱动浏览器执行各种重复性任务，大幅提升工作效率。

项目名称：`ai-browser-automation`
版本：`1.0.0`

### 核心特性
- 🎨 可视化界面，操作简单直观
- 🤖 支持自然语言转换为自动化步骤
- ⚡ 基于Puppeteer的强大浏览器控制能力
- 🧍‍♂️ 模拟人工操作，避免被反爬系统识别
- 📱 支持Electron桌面端和Web两种运行模式
- 🔄 实时任务执行反馈，每步操作自动截图

---

## 2. 项目使用说明

### 2.1 环境要求
- Node.js >= 16.0.0
- 支持Windows/macOS/Linux操作系统

### 2.2 安装依赖
```bash
cd frontend-admin
npm install
```

### 2.3 运行模式

#### 2.3.1 开发模式（Electron桌面端）
```bash
npm run dev:electron
```
此模式会同时启动Vite开发服务器和Electron应用，支持热更新。

#### 2.3.2 纯Web开发模式
```bash
npm run dev
```
此模式仅启动Vite服务器，可在浏览器中访问，部分功能受限。

#### 2.3.3 服务端模式
```bash
npm run server
```
启动Express后端服务，支持远程浏览器控制。

### 2.4 生产构建

#### 构建桌面端安装包
```bash
# macOS
npm run dist

# Windows
npm run dist:win

# Linux
npm run dist:linux
```

#### 构建纯Web版本
```bash
npm run build:web
```

### 2.5 主要功能使用说明

1. **启动浏览器**：点击"启动浏览器"按钮，会自动打开一个可控的Chrome浏览器窗口
2. **访问网页**：在地址栏输入网址，点击"打开"即可导航到目标页面
3. **手动控制**：提供了点击、输入、滚动、截图、前进/后退等常用浏览器操作
4. **任务录制/执行**：可以录制一系列操作步骤，保存为任务后可重复执行
5. **AI驱动**：输入自然语言指令，系统会自动解析为可执行的操作步骤

---

## 3. 自动化实现逻辑

### 3.1 核心技术栈
- **Puppeteer**：Google官方的Chrome无头浏览器控制库，提供完整的浏览器操作API
- **TypeScript**：类型安全的开发语言，提升代码可维护性
- **Electron**：桌面端应用框架，实现主进程和渲染进程分离架构

### 3.2 浏览器控制层
```typescript
// BrowserController核心实现
export class BrowserController {
  private browser: Browser | null = null
  private page: Page | null = null

  // 模拟人工操作特性
  private randomDelay(range: { min: number; max: number }): number
  private async humanType(text: string): Promise<void>
  private async humanMouseMove(x: number, y: number): Promise<void>

  // 操作方法
  async launch(): Promise<void>
  async navigate(url: string): Promise<void>
  async click(selector: string): Promise<void>
  async clickByText(text: string): Promise<void>
  async type(selector: string, text: string): Promise<void>
  async screenshot(): Promise<string>
  // ... 其他操作方法
}
```

### 3.3 人工操作模拟
为了避免被网站反爬系统识别，系统实现了高度拟人化的操作：
- **打字模拟**：每个字符输入间隔30-100ms随机延迟
- **鼠标移动**：分10步平滑移动到目标位置，总耗时200-500ms
- **点击延迟**：移动到目标位置后随机等待100-300ms再点击
- **滚动模拟**：平滑滚动到目标位置，等待300-600ms完成
- **错误容错**：对常见网络错误、超时等情况有自动重试和容错机制

### 3.4 任务执行引擎
任务执行采用分步执行模式：
1. 接收任务ID和步骤数组
2. 按顺序逐个执行步骤
3. 每个步骤执行完成后发送执行结果（成功/失败）和截图
4. 出现错误时立即终止任务并返回错误信息
5. 全部步骤完成后发送任务完成事件

---

## 4. 进程通信实现逻辑

### 4.1 通信架构
项目采用Electron经典的主进程-渲染进程分离架构，通过IPC（进程间通信）实现数据和指令传递：

```
┌─────────────────┐         IPC通信         ┌─────────────────┐
│   渲染进程      │  ◄────────────────────►  │    主进程       │
│ (Vue3前端界面)  │   invoke/on/emit        │ (Node.js + Puppeteer) │
└─────────────────┘                          └─────────────────┘
         ▲                                            ▲
         │                                            │
         ▼                                            ▼
┌─────────────────┐                          ┌─────────────────┐
│  Preload脚本    │                          │  浏览器控制器   │
│ (安全API暴露)   │                          │ (BrowserController) │
└─────────────────┘                          └─────────────────┘
```

### 4.2 通信层实现

#### 4.2.1 Preload层（安全边界）
```typescript
// preload.ts - 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  browser: {
    launch: () => ipcRenderer.invoke('browser:launch'),
    close: () => ipcRenderer.invoke('browser:close'),
    // ... 其他浏览器操作API
  },
  task: {
    execute: (taskId: string, steps: unknown[]) => ipcRenderer.invoke('task:execute', taskId, steps),
    // ... 其他任务操作API
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    // 仅允许监听白名单内的事件，提升安全性
    const validChannels = ['task:step-completed', 'task:completed', 'task:error', ...]
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  }
})
```

#### 4.2.2 主进程处理器
```typescript
// handlers.ts - 主进程IPC处理器
export function setupIpcHandlers(ipcMain: IpcMain, browserController: BrowserController) {
  // 浏览器控制类指令
  ipcMain.handle('browser:launch', async () => { /* ... */ })
  ipcMain.handle('browser:navigate', async (_event, url: string) => { /* ... */ })
  // ... 其他handle

  // 任务执行类指令
  ipcMain.handle('task:execute', async (event, taskId: string, steps: ActionStep[]) => {
    const sender = event.sender
    for (let i = 0; i < steps.length; i++) {
      // 执行步骤
      sender.send('task:step-started', { taskId, stepId: step.id, index: i })
      // 执行完成后发送结果
      sender.send('task:step-completed', { taskId, stepId: step.id, status: 'completed', screenshot })
    }
    sender.send('task:completed', { taskId })
  })
}
```

#### 4.2.3 渲染进程服务层
```typescript
// browserService.ts - 统一服务层
class UnifiedBrowserService implements BrowserService {
  private get useElectron(): boolean {
    return typeof window.electronAPI !== 'undefined'
  }

  async launch(): Promise<void> {
    if (this.useElectron) {
      await window.electronAPI.browser.launch()
    } else {
      await browserApi.launch() // Web模式下走HTTP API
    }
  }
  // ... 其他方法
}
```

### 4.3 进程通信承担的责任

1. **安全隔离**：
   - Preload脚本作为安全边界，仅暴露必要的API给渲染进程
   - 阻止渲染进程直接访问Node.js API，避免安全漏洞
   - 事件白名单机制，防止恶意代码监听内部事件

2. **职责分离**：
   - 渲染进程负责UI展示和用户交互
   - 主进程负责重量级的浏览器控制和任务执行
   - 避免UI阻塞，保证界面流畅响应

3. **异步通信**：
   - 所有操作都是异步非阻塞的
   - 支持实时事件推送（任务进度、状态变化等）
   - 统一的错误处理和友好的错误信息转换

4. **多模式兼容**：
   - 同一套API在Electron环境走IPC通信
   - 在Web环境自动降级为HTTP API调用
   - 上层业务代码无需关心底层实现差异

5. **性能优化**：
   - 二进制数据（截图）直接通过IPC传输，性能远高于HTTP
   - 事件驱动模型，减少不必要的轮询
   - 主进程可复用浏览器实例，避免重复启动开销

---

## 5. 项目整体架构

### 5.1 层级架构图
```
┌─────────────────────────────────────────────────────┐
│                     表示层                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Vue组件    │  │  路由系统   │  │  状态管理   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────┤
│                     服务层                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ 浏览器服务  │  │  AI解析服务 │  │  API服务    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────┤
│                     适配层                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ ElectronIPC │  │  HTTP API   │  │ WebSocket   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────┤
│                     核心层                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ 浏览器控制  │  │ 任务执行器  │  │ 人工模拟    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────┤
│                     基础设施层                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ Puppeteer   │  │  Electron   │  │  Express    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 5.2 目录结构说明
```
frontend-admin/
├── src/
│   ├── main/                 # Electron主进程代码
│   │   ├── browser/          # 浏览器控制器实现
│   │   ├── ipc/              # IPC通信处理器
│   │   ├── index.ts          # 主进程入口
│   │   └── preload.ts        # Preload脚本
│   ├── renderer/             # 渲染进程（前端）代码
│   │   ├── views/            # Vue页面组件
│   │   ├── services/         # 业务服务层
│   │   ├── router/           # 路由配置
│   │   └── main.ts           # 前端入口
│   └── shared/               # 主进程和渲染进程共享代码
│       ├── constants/        # 常量定义
│       └── types/            # TypeScript类型定义
├── server/                   # 纯Web模式后端服务
│   ├── services/             # 后端服务实现
│   └── index.js              # 服务端入口
├── package.json              # 项目依赖和脚本配置
└── vite.config.ts            # Vite构建配置
```

### 5.3 核心设计思想

1. **关注点分离**：
   - UI层与业务逻辑完全分离
   - 主进程与渲染进程职责清晰
   - 核心业务逻辑与框架解耦

2. **可扩展性**：
   - 插件化设计，方便添加新的浏览器操作
   - 统一的服务接口，轻松支持新的运行环境
   - 类型化设计，降低维护成本

3. **用户体验优先**：
   - 所有操作都有即时反馈
   - 友好的错误提示，而非技术栈错误
   - 实时进度展示，每步操作自动截图

4. **安全第一**：
   - 最小权限原则，Preload仅暴露必要API
   - 输入验证和错误处理全覆盖
   - 无远程代码执行能力，确保使用安全

---

## 6. 技术栈清单

| 技术/框架 | 版本 | 用途 |
|----------|------|------|
| Vue 3 | ^3.4.21 | 前端框架 |
| Electron | ^29.1.0 | 桌面端应用框架 |
| Puppeteer | ^22.4.1 | 浏览器自动化控制 |
| TypeScript | ^5.4.2 | 类型安全开发 |
| Vite | ^5.1.6 | 构建工具 |
| Element Plus | ^2.6.1 | UI组件库 |
| Express | ^4.18.3 | Web服务端框架 |
| Vue Router | ^4.3.0 | 前端路由 |
| Pinia | ^2.1.7 | 状态管理 |
