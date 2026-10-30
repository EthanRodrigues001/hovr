/**
 * System tray icon + context menu.
 *
 * The notch has no taskbar button and no window chrome, so the tray is the user's
 * handle on the app: show/hide, settings, refresh, which display the notch lives
 * on, and quit. The menu is rebuilt every time it opens so checkmarks and the
 * display list are always current.
 */
import { Menu, Tray, app, nativeImage, screen } from 'electron'
import { existsSync } from 'node:fs'
import { PATHS } from '../store/paths'
import { loadSettings, saveSettings } from '../store/settings'
import {
  getDisplayListOptions,
  popUpAndRetract,
  registerWindowRepositionListener,
  repositionWindow,
  setVisible
} from './window'
import { pushState } from './state'
import { refreshUsage } from './usageService'

let tray: Tray | null = null
let rebuildMenu: (() => void) | null = null

/** A tiny placeholder if no icon exists on disk (first run / dev). */
function fallbackIcon(): Electron.NativeImage {
  // 16x16 transparent PNG with a centered accent dot.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAW0lEQVR4AcXOMQ4AIQhF4eD9' +
      '/yWhVSChGAyMKlmJUqCYjCDxgi+gnqEVREe0g1FXuATdQI/CBXQMvABjgn0wAbJBHzPmJ2gB' +
      '1mYAAAAASUVORK5CYII=',
    'base64'
  )
  return nativeImage.createFromBuffer(png).resize({ width: 16, height: 16 })
}

export function createTray(): Tray {
  const iconPath = PATHS.trayIcon()
  // Windows draws tray icons at 16 logical px (32 physical on 2x), so hand it 32.
  const image = existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32, quality: 'best' })
    : fallbackIcon()
  tray = new Tray(image)
  tray.setToolTip('HOVR')

  function buildDisplaySubmenu(): Electron.MenuItemConstructorOptions[] {
    return getDisplayListOptions().map((d) => ({
      label: d.label,
      type: 'radio' as const,
      checked: d.isCurrent,
      click: () => {
        // Persist id + geometry so the next reboot can fuzzy-match via workArea.
        const next = saveSettings({
          stickDisplayId: d.id,
          stickDisplayWorkArea: d.workArea,
          stickDisplayScaleFactor: d.scaleFactor
        })
        pushState.settings(next)
        repositionWindow()
        popUpAndRetract(1500)
        rebuild()
      }
    }))
  }

  const rebuild = () => {
    const settings = loadSettings()
    tray?.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: 'Show usage',
          click: () => {
            setVisible(true)
            pushState.togglePanel()
          }
        },
        {
          label: 'Settings',
          click: () => {
            setVisible(true)
            pushState.openSettings()
          }
        },
        { label: 'Refresh now', click: () => void refreshUsage() },
        { type: 'separator' },
        {
          label: 'Ignore hover in fullscreen apps',
          type: 'checkbox',
          checked: settings.suppressInFullscreen,
          click: (item) => {
            pushState.settings(saveSettings({ suppressInFullscreen: item.checked }))
            rebuild()
          }
        },
        { label: 'Display', submenu: buildDisplaySubmenu() },
        { type: 'separator' },
        { label: 'Quit HOVR', click: () => app.quit() }
      ])
    )
  }

  tray.on('click', () => {
    setVisible(true)
    pushState.togglePanel()
  })

  // Rebuild right before showing so displays and checkmarks are current.
  tray.on('right-click', () => {
    rebuild()
    tray?.popUpContextMenu()
  })

  screen.on('display-added', rebuild)
  screen.on('display-removed', rebuild)
  screen.on('display-metrics-changed', rebuild)
  registerWindowRepositionListener(rebuild)

  rebuildMenu = rebuild
  rebuild()
  return tray
}

export function rebuildTrayMenu(): void {
  rebuildMenu?.()
}
