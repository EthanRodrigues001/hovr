/**
 * Electron main process entry point.
 *
 * Lifecycle:
 *   1. Single-instance lock (only one HOVR may run).
 *   2. App 'ready' -> create the notch window + tray, register IPC, start polling
 *      the cursor (hover) and the usage service (limits).
 *   3. On 'window-all-closed' we DON'T quit (the notch is hidden, not closed).
 *   4. Quit from the tray menu tears everything down cleanly.
 */
import { app, BrowserWindow, globalShortcut, session } from 'electron'
import { runtime } from './config'
import { createWindow, getMainWindow, setVisible, startCursorPoll, stopCursorPoll, stopHeartbeat } from './window'
import { createTray } from './tray'
import { registerIpc } from './ipc'
import { loadSettings, pushState } from './state'
import { initAutoUpdater } from './updater'
import { startFullscreenMonitor, stopFullscreenMonitor, triggerFullscreenCheck } from './fullscreen'
import { startUsageService, stopUsageService } from './usageService'

// The notch is small and mostly static. Chromium's GPU process costs more memory
// than it saves here, so use software compositing. Must run before 'ready'.
app.disableHardwareAcceleration()

// Restrict the renderer to a single webContents and forbid remote module usage.
app.enableSandbox()

// ---- single instance -------------------------------------------------------
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // A second copy just reveals the existing notch.
    setVisible(true)
    pushState.togglePanel(true)
  })
  app.on('browser-window-blur', () => triggerFullscreenCheck())
}

// ---- app lifecycle ---------------------------------------------------------
app.on('before-quit', () => {
  runtime.quitting = true
  stopCursorPoll()
  stopHeartbeat()
  stopFullscreenMonitor()
  stopUsageService()
  globalShortcut.unregisterAll()
})

app.whenReady().then(() => {
  // Branded native notifications on Windows.
  app.setAppUserModelId('com.HOVR.app')

  // Lock the renderer session down: deny every permission request.
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false))

  createWindow()
  startCursorPoll()
  startFullscreenMonitor()
  createTray()
  registerIpc()
  startUsageService()

  // Alt+C toggles the notch (throttled so key repeat can't flicker it).
  let lastToggleTime = 0
  const registered = globalShortcut.register('Alt+C', () => {
    if (runtime.quitting) return
    const now = Date.now()
    if (now - lastToggleTime < 500) return
    lastToggleTime = now
    pushState.togglePanel()
  })
  if (!registered) console.error('[Main] Could not register the Alt+C shortcut (already taken?)')

  const settings = loadSettings()
  if (app.isPackaged) {
    try {
      app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin, path: app.getPath('exe') })
    } catch {
      /* ignore in non-packaged / sandbox */
    }
  }
  pushState.settings(settings)
  initAutoUpdater()
})

app.on('window-all-closed', () => {
  // Never quit when the notch window hides; quitting is the tray's job.
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

void getMainWindow
