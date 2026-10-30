/**
 * IPC handler registration.
 *
 * Each `ipcMain.handle` here mirrors a contract in `shared/ipc.ts`. The
 * renderer calls them through the typed preload bridge, so a signature mismatch
 * is a compile-time error rather than a runtime one.
 */
import { app, ipcMain } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type InvokeMap, type InvokeChannel } from '../../shared/ipc'
import { loadSettings, saveSettings, pushState } from './state'
import { setInteractive, repositionWindow, getDisplayListOptions, popUpAndRetract } from './window'
import { rebuildTrayMenu } from './tray'
import { quitAndInstallUpdate } from './updater'
import { getHistory } from './history/historyService'
import { getUsageState, onUsageSettingsChanged, refreshUsage } from './usageService'

/**
 * Type-checked registration helper: guarantees the handler's return matches the
 * contract declared in InvokeMap.
 */
function handle<C extends InvokeChannel>(
  channel: C,
  fn: (...args: InvokeMap[C]['args']) => Promise<InvokeMap[C]['result']> | InvokeMap[C]['result']
): void {
  ipcMain.handle(channel, (_e, ...args) => fn(...(args as InvokeMap[C]['args'])))
}

/** Detects whether the app is packaged and running as a Microsoft Store (MSIX) build. */
export function isStoreBuild(): boolean {
  if (process.windowsStore || process.env.APP_BUILD_TARGET === 'store') {
    return true
  }
  try {
    if (app.isPackaged) {
      const pkgPath = join(app.getAppPath(), 'package.json')
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
        if (pkg.buildTarget === 'store') {
          return true
        }
      }
    }
  } catch {
    /* ignore */
  }
  return false
}

export function registerIpc(): void {
  handle('state:load', () => {
    return {
      settings: loadSettings(),
      version: app.getVersion()
    }
  })

  handle('app:install-update', () => {
    if (isStoreBuild()) return
    console.log('[IPC] app:install-update requested by renderer — calling quitAndInstallUpdate')
    quitAndInstallUpdate()
  })

  handle('app:quit', () => {
    console.log('[IPC] app:quit requested by renderer — quitting application')
    app.quit()
  })

  handle('settings:update', (patch) => {
    // When the user explicitly picks a display, also persist its geometry so
    // the next reboot can re-identify the monitor via fuzzy bounds matching
    // even after Windows re-assigns numeric display IDs.
    let enrichedPatch = { ...patch }
    if ('stickDisplayId' in patch) {
      const chosen = getDisplayListOptions().find((d) => d.id === patch.stickDisplayId)
      enrichedPatch = {
        ...enrichedPatch,
        // Cleared (back to primary) when no display was chosen.
        stickDisplayWorkArea: chosen?.workArea,
        stickDisplayScaleFactor: chosen?.scaleFactor
      }
    }
    const next = saveSettings(enrichedPatch)
    if (patch.launchAtLogin !== undefined && app.isPackaged) {
      try {
        app.setLoginItemSettings({
          openAtLogin: next.launchAtLogin,
          path: app.getPath('exe')
        })
      } catch { /* ignore */ }
    }
    if ('stickDisplayId' in patch) {
      repositionWindow()
      popUpAndRetract(1500)
    }
    if (patch.disabledProviders !== undefined || patch.usageRefreshMinutes !== undefined) {
      onUsageSettingsChanged()
    }
    pushState.settings(next)
    rebuildTrayMenu()
    return next
  })

  handle('window:set-interactive', (value) => {
    setInteractive(value)
  })


  handle('usage:get', () => getUsageState())
  handle('usage:refresh', async () => {
    await refreshUsage()
    return getUsageState()
  })

  handle('history:get', (days) => getHistory(days))

  handle('displays:list', () => {
    return getDisplayListOptions()
  })
}
