const { contextBridge, ipcRenderer } = require('electron')

console.log('=== Preload script executing ===')

contextBridge.exposeInMainWorld('electronAPI', {
  browser: {
    launch: () => ipcRenderer.invoke('browser:launch'),
    close: () => ipcRenderer.invoke('browser:close'),
    navigate: (url) => ipcRenderer.invoke('browser:navigate', url),
    click: (selector) => ipcRenderer.invoke('browser:click', selector),
    type: (selector, text) => ipcRenderer.invoke('browser:type', selector, text),
    screenshot: async () => {
      const result = await ipcRenderer.invoke('browser:screenshot')
      return result.image || ''
    },
    scroll: (direction) => ipcRenderer.invoke('browser:scroll', direction),
    wait: (ms) => ipcRenderer.invoke('browser:wait', ms),
    getStatus: () => ipcRenderer.invoke('browser:status'),
    goBack: () => ipcRenderer.invoke('browser:back'),
    goForward: () => ipcRenderer.invoke('browser:forward'),
    refresh: () => ipcRenderer.invoke('browser:refresh')
  }
})

console.log('=== electronAPI exposed ===')
