// 浏览器状态
export interface BrowserState {
  isConnected: boolean
  currentUrl: string
  title: string
  isLoading: boolean
  screenshot?: string
}

// 操作步骤
export interface ActionStep {
  id: string
  type: ActionType
  description: string
  params: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'failed'
  duration?: number
  error?: string
  screenshot?: string
}

// 操作类型
export type ActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'scroll'
  | 'wait'
  | 'screenshot'
  | 'hover'
  | 'select'
  | 'press'
  | 'refresh'
  | 'back'
  | 'forward'
