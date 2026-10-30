/**
 * The notch BrowserWindow.
 *
 * A fixed-size transparent canvas centred on the top edge of the chosen display's
 * work area. The visible notch (pill / card / settings sheet) is drawn by the
 * renderer inside it. While collapsed the window is click-through
 * (`setIgnoreMouseEvents(true)`), so the desktop below stays fully usable; hover is
 * detected here by polling the OS cursor position, which keeps working while the
 * window ignores the mouse. Once the notch opens the renderer calls
 * `setInteractive(true)` and the card receives clicks.
 *
 * NOTE: this module must NOT import from state.ts to avoid circular dependencies.
 */
import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'node:path'
import { NOTCH } from '../../shared/notch'
import { APP_CONFIG, runtime } from './config'
import { PATHS } from '../store/paths'
import { computeNotchBounds, resolveDisplay, type DisplayInfo } from './geometry'
import { loadSettings, saveSettings } from '../store/settings'
import { isFullscreenAppActive, registerFullscreenActiveListener } from './fullscreen'

let mainWindow: BrowserWindow | null = null
let interactive = false

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/** True when the window currently accepts mouse clicks (notch is "open"). */
export function isInteractive(): boolean {
  return interactive
}

/**
 * Toggle whether the window swallows pointer events.
 *
 * - false (collapsed): click-through. Windows passes all clicks to apps beneath.
 * - true  (open): a normal interactive window.
 * 'screen-saver' level keeps it above fullscreen browsers and games.
 */
export function setInteractive(value: boolean): void {
  if (!mainWindow || value === interactive) return
  interactive = value
  if (value) mainWindow.setIgnoreMouseEvents(false)
  else mainWindow.setIgnoreMouseEvents(true, { forward: false })
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
}

/* ------------------------------------------------------------------ */
/* Cursor polling                                                      */
/* ------------------------------------------------------------------ */

let cursorPollTimer: ReturnType<typeof setInterval> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let wasNear = false

/**
 * Poll the OS cursor every ~16 ms and stream its position (relative to the window)
 * to the renderer while it is near the notch, while the notch is open, and once more
 * when it leaves. `forward:true` pointer events are unreliable on Windows
 * transparent windows, hence the poll.
 */
export function startCursorPoll(): void {
  if (cursorPollTimer !== null) return
  cursorPollTimer = setInterval(() => {
    if (runtime.quitting || !mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) return
    if (loadSettings().suppressInFullscreen && isFullscreenAppActive()) return

    const pt = screen.getCursorScreenPoint()
    const b = mainWindow.getBounds()
    const x = pt.x - b.x
    const y = pt.y - b.y
    // Windows occasionally reports garbage coordinates.
    if (Math.abs(x) > 20000 || Math.abs(y) > 20000) return

    const near =
      x >= -NOTCH.buffer && x <= b.width + NOTCH.buffer && y >= -NOTCH.buffer && y <= b.height + NOTCH.buffer
    if ((near || interactive || wasNear) && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('window:cursor', { x, y, width: b.width, height: b.height })
    }
    wasNear = near
  }, 16)
}

export function stopCursorPoll(): void {
  if (cursorPollTimer !== null) {
    clearInterval(cursorPollTimer)
    cursorPollTimer = null
  }
}

export function stopHeartbeat(): void {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

/* ------------------------------------------------------------------ */
/* Placement                                                           */
/* ------------------------------------------------------------------ */

function currentDisplays(): DisplayInfo[] {
  const primaryId = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    workArea: { ...d.workArea },
    scaleFactor: d.scaleFactor,
    isPrimary: d.id === primaryId
  }))
}

function getNotchGeometry(): { x: number; y: number; width: number; height: number } {
  let settings = loadSettings()
  const displays = currentDisplays()
  const result = computeNotchBounds({
    displays,
    displayId: settings.stickDisplayId,
    savedWorkArea: settings.stickDisplayWorkArea,
    savedScaleFactor: settings.stickDisplayScaleFactor,
    windowWidth: NOTCH.windowWidth,
    windowHeight: NOTCH.windowHeight,
    currentBounds: mainWindow?.getBounds()
  })
  const resolved = result.resolvedDisplay

  // Self-heal: keep the persisted display fingerprint in step with what resolved.
  const savedId = settings.stickDisplayId
  const idWasStale = savedId !== undefined && !displays.some((d) => d.id === savedId)
  if (idWasStale) {
    // The saved id is gone (disconnected, or renumbered after a reboot).
    const recoveredViaBounds = settings.stickDisplayWorkArea !== undefined && !resolved.isPrimary
    console.log(
      recoveredViaBounds
        ? `[Main] Display ${savedId} re-matched via geometry to display ${resolved.id}.`
        : `[Main] Display ${savedId} disconnected or unrecognised. Falling back to display ${resolved.id}.`
    )
    settings = saveSettings({
      stickDisplayId: recoveredViaBounds ? resolved.id : undefined,
      stickDisplayWorkArea: recoveredViaBounds ? resolved.workArea : undefined,
      stickDisplayScaleFactor: recoveredViaBounds ? resolved.scaleFactor : undefined
    })
    sendSettings(settings)
    // A genuine fallback moved the notch to a different screen: show where it went.
    if (!recoveredViaBounds) popUpAndRetract(1500)
  } else if (savedId !== undefined && savedId !== resolved.id) {
    settings = saveSettings({
      stickDisplayId: resolved.id,
      stickDisplayWorkArea: resolved.workArea,
      stickDisplayScaleFactor: resolved.scaleFactor
    })
    sendSettings(settings)
  } else if (
    savedId !== undefined &&
    (settings.stickDisplayWorkArea === undefined || settings.stickDisplayScaleFactor === undefined)
  ) {
    saveSettings({ stickDisplayWorkArea: resolved.workArea, stickDisplayScaleFactor: resolved.scaleFactor })
  }

  return { x: result.x, y: result.y, width: result.width, height: result.height }
}

function sendSettings(settings: ReturnType<typeof loadSettings>): void {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('state:settings', settings)
  }
}

export function createWindow(): BrowserWindow {
  const { x, y, width, height } = getNotchGeometry()

  mainWindow = new BrowserWindow({
    icon: PATHS.icon(),
    x,
    y,
    width,
    height,
    show: false,
    frame: false,
    fullscreenable: false,
    maximizable: false,
    movable: false,
    resizable: false,
    transparent: true,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    backgroundColor: '#00000000',
    roundedCorners: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })

  // Start click-through; hover detection is the cursor poll.
  mainWindow.setIgnoreMouseEvents(true, { forward: false })

  registerFullscreenActiveListener(() => {
    if (!loadSettings().suppressInFullscreen) return
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('window:toggle', false)
    }
    setInteractive(false)
  })

  const handleDisplayChange = (triggerPopUp = false) => {
    console.log('[Main] Display metrics/topology changed, repositioning window')
    repositionWindow()
    if (triggerPopUp) popUpAndRetract(1500)
  }
  screen.on('display-metrics-changed', () => handleDisplayChange(false))
  const onTopologyChange = () => {
    handleDisplayChange(true)
    setTimeout(() => handleDisplayChange(false), 300)
  }
  screen.on('display-added', onTopologyChange)
  screen.on('display-removed', onTopologyChange)

  mainWindow.on('focus', () => mainWindow?.setAlwaysOnTop(true, 'screen-saver'))

  // Open external links in the default browser.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (APP_CONFIG.is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return
    console.log('[Main] notch window bounds', JSON.stringify(mainWindow.getBounds()))
    mainWindow.showInactive()
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
  })

  mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`)
  })

  mainWindow.on('close', (e) => {
    if (!runtime.quitting) e.preventDefault()
  })

  // Windows fullscreen apps (Chrome YouTube, games) push floating windows behind
  // them. Re-asserting the level every 500 ms brings the notch back as soon as the
  // user leaves fullscreen.
  if (heartbeatTimer !== null) clearInterval(heartbeatTimer)
  heartbeatTimer = setInterval(() => {
    if (runtime.quitting || interactive) return
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
    }
  }, 500)

  return mainWindow
}

let onWindowRepositioned: (() => void) | null = null
export function registerWindowRepositionListener(fn: () => void): void {
  onWindowRepositioned = fn
}

export function getActiveDisplayId(): number {
  const settings = loadSettings()
  return resolveDisplay({
    displays: currentDisplays(),
    displayId: settings.stickDisplayId,
    savedWorkArea: settings.stickDisplayWorkArea,
    savedScaleFactor: settings.stickDisplayScaleFactor
  }).id
}

export function getDisplayListOptions(): Array<{
  id: number
  bounds: { x: number; y: number; width: number; height: number }
  /** Usable area (excludes the taskbar): the fingerprint display matching uses. */
  workArea: { x: number; y: number; width: number; height: number }
  scaleFactor: number
  isPrimary: boolean
  isCurrent: boolean
  label: string
  name: string
  resolution: string
}> {
  const all = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()
  const activeId = getActiveDisplayId()

  return all.map((d, index) => {
    const isPrimary = d.id === primary.id
    const rawName = (d as unknown as { label?: string; name?: string }).label || ''
    const fallbackName = isPrimary ? 'Primary Monitor' : `Display ${index + 1}`
    const baseName = rawName.trim() ? rawName.trim() : fallbackName
    const name = isPrimary
      ? baseName.toLowerCase().includes('primary')
        ? baseName
        : `${baseName} (Primary)`
      : baseName
    const scale = d.scaleFactor || 1
    const resolution = `${Math.round(d.bounds.width * scale)}×${Math.round(d.bounds.height * scale)}`
    return {
      id: d.id,
      bounds: { x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height },
      workArea: { ...d.workArea },
      scaleFactor: scale,
      isPrimary,
      isCurrent: d.id === activeId,
      label: `${name} ${resolution}`,
      name,
      resolution
    }
  })
}

let popUpTimer: ReturnType<typeof setTimeout> | null = null

/** Briefly open the notch (e.g. to confirm it moved to another display), then close it. */
export function popUpAndRetract(durationMs = 1500): void {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.showInactive()
  mainWindow.setAlwaysOnTop(true, 'screen-saver')

  const wasAlreadyOpen = interactive
  mainWindow.webContents.send('window:toggle', true)
  if (popUpTimer !== null) clearTimeout(popUpTimer)
  if (wasAlreadyOpen) return
  popUpTimer = setTimeout(() => {
    popUpTimer = null
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('window:toggle', false)
    }
  }, durationMs)
}

export function repositionWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.showInactive()
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.setBounds({ ...getNotchGeometry() })
  onWindowRepositioned?.()
}

/** Toggle the notch window between shown (always on top) and fully hidden. */
export function setVisible(visible: boolean): void {
  if (!mainWindow) return
  if (visible) {
    mainWindow.showInactive()
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
  } else {
    mainWindow.hide()
  }
}
