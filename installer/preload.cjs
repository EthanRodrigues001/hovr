const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('setup', {
  state: () => ipcRenderer.invoke('state'),
  install: () => ipcRenderer.invoke('install'),
  uninstall: () => ipcRenderer.invoke('uninstall'),
  launch: () => ipcRenderer.invoke('launch'),
  close: () => ipcRenderer.send('close'),
  minimize: () => ipcRenderer.send('minimize'),
  onPhase: (cb) => ipcRenderer.on('phase', (_e, p) => cb(p))
})
