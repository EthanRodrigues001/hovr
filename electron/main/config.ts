/** App-wide constants and environment flags for the main process. */

/** Mutable runtime flags (kept separate from the frozen config object). */
export const runtime = {
  /** Set true only while the app is genuinely quitting (tray -> Quit). */
  quitting: false,
  /** Tray -> Pause HOVR. Never saved: HOVR is always on after a restart. */
  paused: false
}

export const APP_CONFIG = {
  appName: 'HOVR',
  /** Custom protocol used to serve local image files to the renderer securely. */
  imageProtocol: 'edgelocal',
  is: {
    get dev(): boolean {
      return !!process.env.ELECTRON_RENDERER_URL || process.env.NODE_ENV === 'development'
    }
  }
} as const
