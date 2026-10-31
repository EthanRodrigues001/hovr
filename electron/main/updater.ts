import { Notification, app } from 'electron'
import type { UpdateStatus } from '../../shared/types'
import { BRAND } from '../../shared/brand'
import { isStoreBuild } from './ipc'
import { pushState } from './state'

// Module-level reference to the single autoUpdater instance.
// This is the ONLY instance — both the download logic and the
// quitAndInstall trigger must use this exact reference.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _autoUpdater: any = null

let status: UpdateStatus = { phase: 'idle' }
let onChange: (() => void) | null = null
let manualCheck = false

export const getUpdateStatus = (): UpdateStatus => status
export const onUpdateStatusChange = (fn: () => void): void => {
  onChange = fn
}
const setStatus = (next: UpdateStatus): void => {
  status = next
  onChange?.()
  pushState.updateStatus(next)
}
const tell = (body: string): void => {
  if (Notification.isSupported()) new Notification({ title: 'HOVR', body }).show()
}

/** Tray -> Check for updates. Says so when there is nothing new. */
export function checkForUpdatesNow(): void {
  if (!_autoUpdater || status.phase === 'checking' || status.phase === 'downloading' || status.phase === 'ready') return
  manualCheck = true
  void runCheck()
}

async function runCheck(): Promise<void> {
  if (!_autoUpdater) return
  setStatus({ phase: 'checking' })
  try {
    await _autoUpdater.checkForUpdates()
  } catch (err) {
    console.warn('[AutoUpdater] checkForUpdates failed:', err instanceof Error ? err.message : err)
    setStatus({ phase: 'error' })
    if (manualCheck) tell('Could not check for updates. Try again in a moment.')
    manualCheck = false
  }
}

/**
 * Called from ipc.ts when the renderer clicks "Restart to Update".
 * Uses the same autoUpdater instance that performed the download.
 */
export function quitAndInstallUpdate(): void {
  if (!_autoUpdater) {
    console.error('[AutoUpdater] quitAndInstall requested but autoUpdater is not initialized.')
    return
  }
  if (!app.isPackaged) {
    console.log('[AutoUpdater] Dev mode — quitAndInstall is a no-op here. Works in packaged builds.')
    return
  }
  console.log('[AutoUpdater] quitAndInstall triggered by renderer button.')
  // Silent: no installer window; the app is started again as soon as it finishes.
  _autoUpdater.quitAndInstall(true, true)
}

/**
 * Initializes electron-updater for GitHub release auto-updates.
 * Completely disabled on Microsoft Store (MSIX) builds to comply with Store policies.
 */
export function initAutoUpdater(): void {
  if (isStoreBuild()) {
    console.log('[AutoUpdater] Store build detected — auto-updater disabled.')
    return
  }

  // Updates come from the project's GitHub releases; with no repo there is nothing to check.
  if (!BRAND.repoUrl) {
    console.log('[AutoUpdater] No repository configured — auto-updater disabled.')
    return
  }

  try {
    const { autoUpdater } = require('electron-updater')

    // Store the module-level reference so quitAndInstallUpdate() can use it
    _autoUpdater = autoUpdater

    // Verbose console logging for diagnostics
    autoUpdater.logger = console
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    // Enable dev-mode testing if unpackaged
    if (!app.isPackaged) {
      console.log('[AutoUpdater] Unpackaged dev build detected — enabling forceDevUpdateConfig')
      autoUpdater.forceDevUpdateConfig = true
    }

    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for update... Current version:', app.getVersion())
    })

    autoUpdater.on('update-available', (info: { version: string }) => {
      console.log('[AutoUpdater] New update available on GitHub:', info.version)
      setStatus({ phase: 'downloading', version: info.version })
      manualCheck = false
    })

    autoUpdater.on('update-not-available', (info: { version: string }) => {
      console.log('[AutoUpdater] App is up to date. Latest release:', info.version, 'Current:', app.getVersion())
      setStatus({ phase: 'idle' })
      if (manualCheck) tell(`You are on the latest version (${app.getVersion()}).`)
      manualCheck = false
    })

    autoUpdater.on('update-downloaded', (info: { version: string }) => {
      console.log('[AutoUpdater] Update downloaded and ready to install:', info.version)
      setStatus({ phase: 'ready', version: info.version })
      tell(`HOVR ${info.version} is ready. Right-click the tray icon and choose Restart to update.`)
    })

    autoUpdater.on('error', (err: Error | string) => {
      const msg = typeof err === 'string' ? err : err?.message
      console.warn('[AutoUpdater] Update check error:', msg)
      if (status.phase === 'checking' || status.phase === 'downloading') setStatus({ phase: 'error' })
    })

    // Check 3 seconds after startup, then every 4 hours while HOVR stays open.
    setTimeout(() => void runCheck(), 3000)
    setInterval(() => {
      if (status.phase === 'idle' || status.phase === 'error') void runCheck()
    }, 4 * 60 * 60 * 1000)
  } catch (err) {
    console.error('[AutoUpdater] Initialization failed:', err)
  }
}
