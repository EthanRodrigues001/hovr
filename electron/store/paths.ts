/**
 * Centralized filesystem locations for persisted state.
 *
 * Everything lives under the OS userData directory so the app is fully portable
 * and self-cleaning. hovr only persists one small settings file.
 */
import { join } from 'node:path'
import { app } from 'electron'

const root = () => app.getPath('userData')

export const PATHS = {
  /** userData root. */
  root,
  /** Path to the settings JSON. */
  settingsFile: () => join(root(), 'settings.json'),
  /** App icon (used by the window). */
  icon: () => join(app.getAppPath(), 'resources', 'icon.png'),
  /** Tray icon (pure white logo without background). */
  trayIcon: () => join(app.getAppPath(), 'resources', 'tray.png')
} as const
