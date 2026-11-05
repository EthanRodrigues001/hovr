/**
 * Shared domain types used by both the Electron main process and the renderer.
 *
 * Usage-limit types live in `usage.ts`; notch geometry constants in `notch.ts`.
 */

export interface DisplayInfo {
  id: number
  bounds: { x: number; y: number; width: number; height: number }
  isPrimary: boolean
  isCurrent?: boolean
  label: string
  name: string
  resolution: string
}

export type CollapsedStyle = 'chips' | 'compact'

export interface Settings {
  /** Start with Windows. */
  launchAtLogin: boolean
  /** Reduce motion for the notch animations. */
  reduceMotion: boolean
  /** Draw with the GPU. Smoother on big or high-DPI screens and while recording; costs a little memory. Needs a restart. */
  smoothAnimation: boolean
  /** Collapsed pill: per-provider remaining % ("chips") or just status dots ("dots"). */
  collapsedStyle: CollapsedStyle
  /**
   * When true, hovering is ignored while a fullscreen game or app is active so the
   * notch never pops up over gameplay.
   */
  suppressInFullscreen: boolean
  /** Display the notch lives on; unset = primary. */
  stickDisplayId?: number
  /**
   * Persisted workArea geometry of the chosen display. Windows re-assigns numeric
   * display ids across reboots, so this is the fuzzy-match fingerprint.
   */
  stickDisplayWorkArea?: { x: number; y: number; width: number; height: number }
  /** DPI scale of the chosen display; tiebreaker for identical-geometry monitors. */
  stickDisplayScaleFactor?: number
  /** Provider ids the user switched off (not read, not shown). */
  disabledProviders: string[]
  /** Desktop notification when a limit is nearly used up or will run out early. */
  notifications: boolean
  /** Provider ids left out of the collapsed pill (empty = every tool shows). */
  pillHidden: string[]
  /** Minutes between usage refreshes (1-60). */
  usageRefreshMinutes: number
  /**
   * Price History in dollars using LiteLLM's public price list (one anonymous
   * download a day, no account data). Off = token counts only.
   */
  showCostEstimates: boolean
  /** Last version whose What's New the user opened. */
  lastSeenChangelogVersion?: string
}

export const DEFAULT_SETTINGS: Settings = {
  launchAtLogin: true,
  reduceMotion: false,
  smoothAnimation: false,
  collapsedStyle: 'chips',
  suppressInFullscreen: true,
  stickDisplayId: undefined,
  stickDisplayWorkArea: undefined,
  stickDisplayScaleFactor: undefined,
  disabledProviders: [],
  notifications: true,
  pillHidden: [],
  usageRefreshMinutes: 5,
  showCostEstimates: true,
  lastSeenChangelogVersion: undefined
}

/** Where the in-app updater is: shown in Settings -> Updates, the notch header and the tray. */
export interface UpdateStatus {
  phase: 'idle' | 'checking' | 'downloading' | 'ready' | 'error'
  /** The new version, once one is found. */
  version?: string
}
