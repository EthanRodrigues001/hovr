/**
 * Preload bridge: the only surface the renderer has onto Electron.
 *
 * Everything is built from the typed contracts in `shared/ipc.ts`, so the
 * renderer gets a fully typed `window.edge` API and never touches a raw channel
 * name. contextIsolation keeps this isolated from page globals; nodeIntegration
 * stays off, so the renderer has no Node access at all.
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { EventChannel, EventArgs, InvokeArgs, InvokeChannel, InvokeResult } from '../../shared/ipc'
import type { EdgeApi } from '../../shared/bridge'
import type { Settings } from '../../shared/types'

/** Typed invoke wrapper derived from the shared contracts. */
function invoke<C extends InvokeChannel>(channel: C, ...args: InvokeArgs<C>): Promise<InvokeResult<C>> {
  return ipcRenderer.invoke(channel, ...args) as Promise<InvokeResult<C>>
}

/** Typed event subscriber. Returns an unsubscribe function. */
function on<C extends EventChannel>(channel: C, listener: (...args: EventArgs<C>) => void): () => void {
  const wrapped = (_e: IpcRendererEvent, ...args: EventArgs<C>) => listener(...args)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.off(channel, wrapped)
}

const api: EdgeApi = {
  /* Renderer -> Main */
  loadState: () => invoke('state:load'),
  installUpdate: () => invoke('app:install-update'),
  quitApp: () => invoke('app:quit'),
  getDisplays: () => invoke('displays:list'),
  updateSettings: (patch: Partial<Settings>) => invoke('settings:update', patch),
  setInteractive: (value: boolean) => invoke('window:set-interactive', value),
  getUsage: () => invoke('usage:get'),
  refreshUsage: () => invoke('usage:refresh'),
  testAlert: () => invoke('alerts:test'),
  getHistory: (days: number) => invoke('history:get', days),
  getSamples: (provider, windowId, since) => invoke('usage:samples', provider, windowId, since),

  /* Main -> Renderer */
  onUsage: (cb) => on('usage:update', cb),
  onSettings: (cb) => on('state:settings', cb),
  onToggle: (cb) => on('window:toggle', cb),
  onOpenSettings: (cb) => on('window:open-settings', cb),
  onCursor: (cb) => on('window:cursor', cb),
  onToast: (cb) => on('ui:toast', cb),
  onUpdateAvailable: (cb) => on('app:update-available', cb),
  onUpdateDownloaded: (cb) => on('app:update-downloaded', cb)
}

contextBridge.exposeInMainWorld('edge', api)
