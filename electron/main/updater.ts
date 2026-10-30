import { app } from 'electron'
import { BRAND } from '../../shared/brand'
import { isStoreBuild } from './ipc'
import { pushState } from './state'

// Module-level reference to the single autoUpdater instance.
// This is the ONLY instance — both the download logic and the
// quitAndInstall trigger must use this exact reference.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _autoUpdater: any = null

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
  _autoUpdater.quitAndInstall(false, true)
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
      pushState.updateAvailable({ version: info.version })
    })

    autoUpdater.on('update-not-available', (info: { version: string }) => {
      console.log('[AutoUpdater] App is up to date. Latest release:', info.version, 'Current:', app.getVersion())
    })

    autoUpdater.on('update-downloaded', (info: { version: string }) => {
      console.log('[AutoUpdater] Update downloaded and ready to install:', info.version)
      pushState.updateDownloaded({ version: info.version })
    })

    autoUpdater.on('error', (err: Error | string) => {
      const msg = typeof err === 'string' ? err : err?.message
      console.warn('[AutoUpdater] Update check error:', msg)
    })

    // Initiate background update check 3 seconds after startup
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err: Error | string) => {
        const msg = typeof err === 'string' ? err : err?.message
        console.warn('[AutoUpdater] checkForUpdates failed:', msg)
      })
    }, 3000)
  } catch (err) {
    console.error('[AutoUpdater] Initialization failed:', err)
  }
}
