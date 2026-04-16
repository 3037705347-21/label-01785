const express = require('express')
const cors = require('cors')
const { WebSocketServer } = require('ws')
const http = require('http')
const path = require('path')
const { BrowserService } = require('./services/browser')
const { TaskService } = require('./services/task')

const app = express()
const PORT = process.env.PORT || 8081

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../dist')))

// 服务实例
const browserService = new BrowserService()
const taskService = new TaskService(browserService)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// API 路由
// 浏览器相关
app.post('/api/browser/launch', async (req, res) => {
  try {
    await browserService.launch()
    res.json({ success: true, message: '浏览器启动成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/browser/close', async (req, res) => {
  try {
    await browserService.close()
    res.json({ success: true, message: '浏览器已关闭' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/browser/status', (req, res) => {
  const status = browserService.getStatus()
  res.json({ success: true, data: status })
})

app.get('/api/browser/screenshot', async (req, res) => {
  try {
    const image = await browserService.screenshot()
    res.json({ success: true, data: { image } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/browser/navigate', async (req, res) => {
  try {
    const { url } = req.body
    await browserService.navigate(url)
    res.json({ success: true, message: '导航成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 任务相关
app.get('/api/tasks', (req, res) => {
  const tasks = taskService.getAllTasks()
  res.json({ success: true, data: tasks })
})

app.post('/api/tasks', (req, res) => {
  try {
    const { name, naturalLanguage } = req.body
    const task = taskService.createTask(name, naturalLanguage)
    res.json({ success: true, data: task })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/tasks/:id', (req, res) => {
  const task = taskService.getTask(req.params.id)
  if (task) {
    res.json({ success: true, data: task })
  } else {
    res.status(404).json({ success: false, error: '任务不存在' })
  }
})

app.post('/api/tasks/:id/execute', async (req, res) => {
  try {
    await taskService.executeTask(req.params.id)
    res.json({ success: true, message: '任务开始执行' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/tasks/:id', (req, res) => {
  try {
    taskService.deleteTask(req.params.id)
    res.json({ success: true, message: '任务已删除' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// SPA 回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

// 创建 HTTP 服务器
const server = http.createServer(app)

// WebSocket 服务器
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws) => {
  console.log('WebSocket client connected')

  // 发送初始状态
  ws.send(JSON.stringify({
    type: 'browser_state',
    payload: browserService.getStatus()
  }))

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      console.log('Received:', data)
    } catch (error) {
      console.error('Invalid message:', error)
    }
  })

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

// 广播函数
function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload })
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message)
    }
  })
}

// 设置广播回调
browserService.setBroadcast(broadcast)
taskService.setBroadcast(broadcast)

// 启动服务器
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`)
})

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('Shutting down...')
  await browserService.close()
  server.close(() => {
    process.exit(0)
  })
})
