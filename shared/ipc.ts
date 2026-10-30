/**
 * Single source of truth for IPC channel names and their payload contracts.
 *
 * The preload bridge is generated from these contracts so the renderer never
 * touches a raw string channel name and the main handler signatures stay in
 * sync with the renderer calls.
 *
 * Convention:
 *   - `Renderer -> Main` calls (invoke/handle) are listed in `InvokeMap`.
 *   - `Main -> Renderer` events (send/on) are listed in `EventMap`.
 */
import type { Settings } from './types'
import type { HistoryReport } from './history'
import type { UsageState } from './usage'

/* ------------------------------------------------------------------ */
/* Renderer -> Main  (ipcMain.handle / ipcRenderer.invoke)            */
/* ------------------------------------------------------------------ */

export interface InvokeMap {
  /** Returns persisted settings + the app version on startup. */
  'state:load': { args: []; result: { settings: Settings; version: string } }

  /** Update a persisted setting. */
  'settings:update': { args: [patch: Partial<Settings>]; result: Settings }

  /** Toggle whether the window is interactive (mouse-ignore). */
  'window:set-interactive': { args: [interactive: boolean]; result: void }

  /** Trigger a download of the already-available update and quit-and-install. */
  'app:install-update': { args: []; result: void }

  /** Quit the application process. */
  'app:quit': { args: []; result: void }

  /** Latest usage snapshot per provider plus provider statuses. */
  'usage:get': { args: []; result: UsageState }

  /** Force a refresh of every provider; resolves once all reads settle. */
  'usage:refresh': { args: []; result: UsageState }

  /** Token + cost history from local session logs, for the last `days` days. */
  'history:get': { args: [days: number]; result: HistoryReport }

  /** Get the list of connected displays. */
  'displays:list': { args: []; result: import('./types').DisplayInfo[] }
}

/* ------------------------------------------------------------------ */
/* Main -> Renderer  (webContents.send / ipcRenderer.on)              */
/* ------------------------------------------------------------------ */

export interface EventMap {
  /** Settings changed (e.g. from the tray menu). */
  'state:settings': [settings: Settings]
  /** Open/close the notch from the main process (shortcut, tray). */
  'window:toggle': [open?: boolean]
  /** Open the notch straight to Settings (tray). */
  'window:open-settings': []
  /** Usage bars or provider statuses changed. */
  'usage:update': [state: UsageState]
  /** Transient user-facing notice, shown as a toast. */
  'ui:toast': [toast: { id: string; message: string; tone: 'info' | 'error' }]
  /** Fired by electron-updater when a new update is available for GitHub builds. */
  'app:update-available': [info: { version: string }]
  /** Fired by electron-updater when the update has been fully downloaded and is ready to install. */
  'app:update-downloaded': [info: { version: string }]
  /**
   * Streamed by the main-process cursor poll while the cursor is near the notch
   * window (or the notch is open), and once more when it leaves. `x`/`y` are
   * relative to the window's top-left. `forward:true` pointer events are unreliable
   * on Windows transparent windows, which is why this exists.
   */
  'window:cursor': [data: { x: number; y: number; width: number; height: number }]
}

/* ------------------------------------------------------------------ */
/* Keys                                                                */
/* ------------------------------------------------------------------ */

/** Typed keyof helpers so channel names can never drift. */
export const INVOKE_CHANNELS = Object.keys({} as InvokeMap) as (keyof InvokeMap)[]
export const EVENT_CHANNELS = Object.keys({} as EventMap) as (keyof EventMap)[]

export type InvokeChannel = keyof InvokeMap
export type EventChannel = keyof EventMap

/** Argument tuple for an invoke channel. */
export type InvokeArgs<C extends InvokeChannel> = InvokeMap[C]['args']
/** Return type for an invoke channel. */
export type InvokeResult<C extends InvokeChannel> = InvokeMap[C]['result']
/** Argument tuple for an event channel. */
export type EventArgs<C extends EventChannel> = EventMap[C]
