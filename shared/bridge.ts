/**
 * Type definition for the preload bridge API surface.
 *
 * Both the preload (implements) and renderer (consumes) import this so the
 * contract lives in one place. The actual implementation lives in the preload;
 * the renderer only ever sees `window.edge` typed as this interface.
 */
import type { Settings, DisplayInfo, UpdateStatus } from './types'
import type { HistoryReport } from './history'
import type { UsageState } from './usage'

export interface EdgeApi {
  /* Renderer -> Main */
  loadState: () => Promise<{ settings: Settings; version: string }>
  installUpdate: () => Promise<void>
  getUpdateStatus: () => Promise<UpdateStatus>
  checkForUpdates: () => Promise<void>
  quitApp: () => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>
  setInteractive: (value: boolean) => Promise<void>
  getDisplays: () => Promise<DisplayInfo[]>
  getUsage: () => Promise<UsageState>
  refreshUsage: () => Promise<UsageState>
  /** Shows a test notification; false when the system cannot. */
  testAlert: () => Promise<boolean>
  getHistory: (days: number) => Promise<HistoryReport>
  getSamples: (provider: string, windowId: string, since: number) => Promise<import('./usage').UsageSample[]>

  /* Main -> Renderer. Each returns an unsubscribe function. */
  onUsage: (cb: (state: UsageState) => void) => () => void
  onSettings: (cb: (settings: Settings) => void) => () => void
  onToggle: (cb: (open?: boolean) => void) => () => void
  onOpenSettings: (cb: () => void) => () => void
  onCursor: (cb: (data: { x: number; y: number; width: number; height: number }) => void) => () => void
  onToast: (cb: (toast: { id: string; message: string; tone: 'info' | 'error' }) => void) => () => void
  onUpdateStatus: (cb: (status: UpdateStatus) => void) => () => void
}
