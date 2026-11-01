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
import { app, BrowserWindow, globalShortcut, session, shell } from 'electron'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { runtime } from './config'
import { createWindow, getMainWindow, setVisible, startCursorPoll, stopCursorPoll, stopHeartbeat } from './window'
import { createTray } from './tray'
import { registerIpc } from './ipc'
import { loadSettings, pushState } from './state'
import { initAutoUpdater } from './updater'
import { startFullscreenMonitor, stopFullscreenMonitor, triggerFullscreenCheck } from './fullscreen'
import { prewarmHistory } from './history/historyService'
import { startUsageService, stopUsageService } from './usageService'
import { loadSettings as readStoredSettings } from '../store/settings'

function readSmoothAnimation(): boolean {
  try {
    return readStoredSettings().smoothAnimation
  } catch {
    return false
  }
}

// The notch is small and mostly static. Chromium's GPU process costs more memory
// than it saves here, so use software compositing unless "Smoother animation" is on (large screens,
// screen recording). Must run before 'ready'.
if (!readSmoothAnimation()) app.disableHardwareAcceleration()

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

/**
 * Windows labels a toast with the name of the Start Menu shortcut that carries the app's
 * AppUserModelID. In development there is none, so toasts showed the raw id. This writes one
 * named "HOVR" (with the icon); the installed app gets its own from the installer.
 */
/**
 * The toast header's name and icon come from this registry key, keyed by the AppUserModelID.
 * Written every launch so a dev run and an installed copy both show "HOVR" with the logo.
 */
function registerToastIdentity(): void {
  if (process.platform !== 'win32') return
  const key = String.raw`HKCU\Software\Classes\AppUserModelId\com.hovr.app`
  const icon = app.isPackaged ? join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'toast.png') : join(app.getAppPath(), 'resources', 'toast.png')
  const set = (name: string, value: string) => execFile('reg', ['add', key, '/v', name, '/t', 'REG_SZ', '/d', value, '/f'], () => {})
  set('DisplayName', 'HOVR')
  set('IconUri', icon)
  set('IconBackgroundColor', '0')
}

function registerStartMenuShortcut(): void {
  if (process.platform !== 'win32') return
  const programs = join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs')
  try {
    if (app.isPackaged) {
      // The installer and the updater start HOVR through this shortcut, so it must always point at the
      // installed exe. Repair it if anything (an older dev run, a moved install) left it pointing elsewhere.
      const link = join(programs, 'HOVR.lnk')
      let current: Electron.ShortcutDetails | null = null
      try {
        current = shell.readShortcutLink(link)
      } catch {
        /* missing */
      }
      if (!current || current.target.toLowerCase() !== process.execPath.toLowerCase() || current.args) {
        shell.writeShortcutLink(link, 'create', {
          target: process.execPath,
          appUserModelId: 'com.hovr.app',
          description: 'HOVR'
        })
      }
      return
    }
    // Dev runs get their own shortcut so they can never overwrite the installed app's.
    const link = join(programs, 'HOVR (dev).lnk')
    shell.writeShortcutLink(link, 'create', {
      target: process.execPath,
      args: app.getAppPath(),
      appUserModelId: 'com.hovr.app',
      icon: join(app.getAppPath(), 'resources', 'icon.ico'),
      description: 'HOVR'
    })
  } catch {
    /* cosmetic only */
  }
}

app.whenReady().then(() => {
  // Branded native notifications on Windows.
  app.setAppUserModelId('com.hovr.app')
  registerStartMenuShortcut()
  registerToastIdentity()

  // Lock the renderer session down: deny every permission request.
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false))

  createWindow()
  startCursorPoll()
  startFullscreenMonitor()
  createTray()
  registerIpc()
  startUsageService()
  prewarmHistory()

  // Alt+C toggles the notch (throttled so key repeat can't flicker it).
  let lastToggleTime = 0
  const registered = globalShortcut.register('Alt+C', () => {
    if (runtime.quitting || runtime.paused) return
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
