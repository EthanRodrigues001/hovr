/**
 * Renderer notification hub.
 *
 * Every main -> renderer push goes through here so there is exactly one place
 * that knows how to reach the window and one place that respects the quitting
 * flag. Handlers should never call `webContents.send` directly.
 *
 * This used to also own the ItemStore and ClipboardWatcher. Both are gone with
 * the clipboard teardown; hovr's only persistent state is settings, which
 * `store/settings.ts` owns directly.
 */
import { loadSettings, saveSettings } from '../store/settings'
import type { Settings } from '../../shared/types'
import type { UsageState } from '../../shared/usage'
import { getMainWindow } from './window'
import { runtime } from './config'

/** Send to the renderer if there is a live window to send to. */
function send(channel: string, ...args: unknown[]): void {
  if (runtime.quitting) return
  const win = getMainWindow()
  if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
    win.webContents.send(channel, ...args)
  }
}

export const pushState = {
  settings(next: Settings): void {
    send('state:settings', next)
  },
  usage(state: UsageState): void {
    send('usage:update', state)
  },
  togglePanel(open?: boolean): void {
    send('window:toggle', open)
  },
  openSettings(): void {
    send('window:open-settings')
  },
  updateStatus(status: import('../../shared/types').UpdateStatus): void {
    send('app:update-status', status)
  }
}

/** Re-export so handlers that mutate settings can broadcast from one import. */
export { loadSettings, saveSettings }
