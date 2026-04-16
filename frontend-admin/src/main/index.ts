import { app, BrowserWindow, ipcMain, session } from 'electron'
import * as path from 'path'
import { BrowserController } from './browser/controller'
import { setupIpcHandlers } from './ipc/handlers'

let mainWindow: BrowserWindow | null = null
let browserController: BrowserController | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

async function createWindow() {
  // 尝试多个可能的 preload 路径
  const possiblePaths = [
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, '..', 'preload.js'),
    path.join(app.getAppPath(), 'preload.js'),
    path.join(process.cwd(), 'preload.js')
  ]

  let preloadPath = ''
  for (const p of possiblePaths) {
    if (require('fs').existsSync(p)) {
      preloadPath = p
      break
    }
  }

  // 设置 CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"]
      }
    })
  })

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: preloadPath
    },
    show: false
  })

  // 初始化浏览器控制器
  browserController = new BrowserController()

  // 设置 IPC 处理器
  setupIpcHandlers(ipcMain, browserController)

  // 加载应用
  if (isDev) {
    try {
      await mainWindow.loadURL('http://localhost:5173')
    } catch (err) {
      // 静默处理
    }
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  // 强制显示窗口
  mainWindow.show()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', async () => {
  // 关闭浏览器
  if (browserController) {
    await browserController.close()
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 导出供其他模块使用
export { mainWindow, browserController }
