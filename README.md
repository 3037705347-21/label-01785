# AI Browser Automation - 可视化AI自动化浏览器

## How to Run

### Electron 桌面应用（推荐）

```bash
cd frontend-admin

# 安装依赖
npm install

# 启动 Electron 桌面应用
npm run dev:electron
```

### Docker 方式运行（Web 模式，功能受限）

```bash
docker-compose up --build -d
# 访问 http://localhost:8081
```

## Services

| 服务 | 端口 | 说明 |
|------|------|------|
| Electron 桌面应用 | - | 本地运行，完整功能 |
| Docker Web 服务 | 8081 | Web 模式，功能受限 |

## 测试账号

本项目为本地浏览器自动化工具，无需登录账号。

## 题目内容

基于Electron开发一个可视化AI自动化浏览器，可以用简单的语言驱动执行电脑本地浏览器执行任务，并且模拟人工操作。

---

## 核心功能

- 🤖 **自然语言驱动**: 使用简单的中文/英文描述任务，自动解析执行
- 🌐 **本地浏览器控制**: 基于 Puppeteer 控制本地 Chrome 浏览器（可见窗口）
- 👁️ **可视化操作**: 实时预览浏览器截图
- 🔄 **人工模拟**: 模拟真实用户行为，包括鼠标移动、打字延迟等

## 支持的指令示例

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

## 使用说明

1. 启动应用后，点击「启动浏览器」按钮，会打开一个由 Puppeteer 控制的 Chrome 浏览器窗口
2. 在「网址导航」输入框中输入网址，点击「前往」导航到目标页面
3. 右侧预览区域会显示当前页面的截图
4. 在「自然语言指令」输入框中输入操作指令，点击「执行指令」自动执行
5. 使用「快捷操作」按钮可以快速截图、滚动页面

## 技术栈

- **桌面框架**: Electron 29
- **前端框架**: Vue 3 + TypeScript + Vite
- **UI组件库**: Element Plus
- **浏览器自动化**: Puppeteer
- **进程通信**: Electron IPC

## 项目结构

```
frontend-admin/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 主进程入口
│   │   ├── preload.ts           # 预加载脚本源码
│   │   ├── browser/
│   │   │   └── controller.ts    # Puppeteer 浏览器控制器
│   │   └── ipc/
│   │       └── handlers.ts      # IPC 消息处理器
│   ├── renderer/                # 渲染进程 (Vue 应用)
│   │   ├── App.vue              # 根组件
│   │   ├── index.html           # HTML 入口
│   │   ├── main.ts              # 渲染进程入口
│   │   ├── router/
│   │   │   └── index.ts         # 路由配置
│   │   ├── services/
│   │   │   ├── aiParser.ts      # AI 指令解析服务
│   │   │   ├── api.ts           # API 服务
│   │   │   └── browserService.ts # 浏览器服务封装
│   │   ├── styles/
│   │   │   └── main.scss        # 全局样式
│   │   ├── utils/
│   │   │   └── format.ts        # 工具函数
│   │   └── views/
│   │       └── BrowserView.vue  # 浏览器控制页面
│   └── shared/                  # 共享模块
│       ├── constants/
│       │   └── index.ts         # 常量定义
│       └── types/
│           └── index.ts         # 类型定义
├── server/                      # Docker Web 模式服务端
│   ├── index.js                 # Express 服务入口
│   └── services/
│       ├── browser.js           # 浏览器服务
│       └── task.js              # 任务服务
├── public/
│   └── favicon.svg              # 网站图标
├── preload.js                   # 预加载脚本 (编译后)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.electron.json
├── tsconfig.node.json
└── Dockerfile
```

## License

MIT License
