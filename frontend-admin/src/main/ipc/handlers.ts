import { IpcMain } from 'electron'
import { BrowserController } from '../browser/controller'
import type { ActionStep } from '../../shared/types'

// 友好的错误信息映射
function friendlyError(error: unknown, context: string): string {
  const msg = error instanceof Error ? error.message : String(error)

  // 常见错误的友好提示
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
  if (msg.includes('Navigation')) {
    return '页面导航失败，请检查网址是否有效'
  }

  return `${context}失败：${msg}`
}

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

  ipcMain.handle('browser:close', async () => {
    try {
      await browserController.close()
      return { success: true }
    } catch (error) {
      throw new Error(friendlyError(error, '关闭浏览器'))
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

  ipcMain.handle('browser:click', async (_event, selector: string) => {
    try {
      // 先尝试通过文本点击（更常用）
      await browserController.clickByText(selector)
      return { success: true }
    } catch {
      try {
        // 再尝试通过选择器点击
        await browserController.click(selector)
        return { success: true }
      } catch (error) {
        throw new Error(`找不到"${selector}"，请确认页面上存在该按钮或链接`)
      }
    }
  })

  ipcMain.handle('browser:type', async (_event, selector: string, text: string) => {
    try {
      if (selector) {
        await browserController.type(selector, text)
      } else {
        await browserController.typeInActiveElement(text)
      }
      return { success: true }
    } catch (error) {
      throw new Error(`输入文字失败，请先点击输入框再执行输入操作`)
    }
  })

  ipcMain.handle('browser:screenshot', async () => {
    try {
      const image = await browserController.screenshot()
      return { success: true, image }
    } catch (error) {
      throw new Error(friendlyError(error, '截图'))
    }
  })

  ipcMain.handle('browser:scroll', async (_event, direction: 'top' | 'bottom') => {
    try {
      await browserController.scroll(direction)
      return { success: true }
    } catch (error) {
      throw new Error(friendlyError(error, '滚动页面'))
    }
  })

  ipcMain.handle('browser:wait', async (_event, ms: number) => {
    await browserController.wait(ms)
    return { success: true }
  })

  ipcMain.handle('browser:status', async () => {
    const status = browserController.getStatus()
    const title = await browserController.getTitle()
    return { ...status, title }
  })

  ipcMain.handle('browser:back', async () => {
    try {
      await browserController.goBack()
      return { success: true }
    } catch (error) {
      throw new Error('无法后退，可能已经是第一个页面')
    }
  })

  ipcMain.handle('browser:forward', async () => {
    try {
      await browserController.goForward()
      return { success: true }
    } catch (error) {
      throw new Error('无法前进，可能已经是最后一个页面')
    }
  })

  ipcMain.handle('browser:refresh', async () => {
    try {
      await browserController.refresh()
      return { success: true }
    } catch (error) {
      throw new Error(friendlyError(error, '刷新页面'))
    }
  })

  // 任务执行
  ipcMain.handle('task:execute', async (event, taskId: string, steps: ActionStep[]) => {
    const sender = event.sender

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const startTime = Date.now()

      try {
        sender.send('task:step-started', { taskId, stepId: step.id, index: i })
        await executeStep(browserController, step)
        const screenshot = await browserController.screenshot()

        sender.send('task:step-completed', {
          taskId,
          stepId: step.id,
          status: 'completed',
          duration: Date.now() - startTime,
          screenshot
        })

      } catch (error) {
        const errorMsg = friendlyError(error, step.description)

        sender.send('task:step-completed', {
          taskId,
          stepId: step.id,
          status: 'failed',
          duration: Date.now() - startTime,
          error: errorMsg
        })

        sender.send('task:error', { taskId, error: errorMsg })
        return { success: false, error: errorMsg }
      }
    }

    sender.send('task:completed', { taskId })
    return { success: true }
  })

  ipcMain.handle('task:pause', async () => ({ success: true }))
  ipcMain.handle('task:resume', async () => ({ success: true }))
  ipcMain.handle('task:stop', async () => ({ success: true }))
}

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
      if (params.selector) {
        await controller.type(params.selector as string, params.text as string)
      } else {
        await controller.typeInActiveElement(params.text as string)
      }
      break
    case 'scroll':
      await controller.scroll(params.direction as 'top' | 'bottom')
      break
    case 'wait':
      await controller.wait(params.duration as number)
      break
    case 'screenshot':
      await controller.screenshot(params.fullPage as boolean)
      break
    case 'hover':
      await controller.hover(params.selector as string)
      break
    case 'select':
      await controller.select(params.selector as string, params.value as string)
      break
    case 'press':
      await controller.pressKey(params.key as string)
      break
    case 'refresh':
      await controller.refresh()
      break
    case 'back':
      await controller.goBack()
      break
    case 'forward':
      await controller.goForward()
      break
    default:
      throw new Error(`不支持的操作类型: ${type}`)
  }
}
