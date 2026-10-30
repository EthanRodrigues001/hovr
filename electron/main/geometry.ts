/**
 * Notch placement: pure geometry, no Electron imports, so it is unit-testable.
 *
 * The window is horizontally centred on the top of the chosen display's work area.
 * Which display is "chosen" is resolved in tiers because Windows re-assigns numeric
 * display ids across reboots.
 */

export interface DisplayInfo {
  id: number
  workArea: { x: number; y: number; width: number; height: number }
  scaleFactor?: number
  isPrimary?: boolean
}

export interface ResolveDisplayParams {
  displays: DisplayInfo[]
  displayId?: number
  /**
   * Persisted workArea geometry from the previous session.
   * Used as Tier-2 fuzzy match when the OS re-assigns numeric IDs on reboot.
   */
  savedWorkArea?: { x: number; y: number; width: number; height: number }
  /** Persisted scale factor: secondary discriminator for identical-geometry monitors. */
  savedScaleFactor?: number
  currentBounds?: { x: number; y: number }
}

export interface NotchBoundsParams extends ResolveDisplayParams {
  windowWidth: number
  windowHeight: number
}

export interface NotchBoundsResult {
  x: number
  y: number
  width: number
  height: number
  displayId: number
  /** The resolved display, exposed so callers can persist fresh geometry. */
  resolvedDisplay: DisplayInfo
}

/**
 * Tolerance (pixels) for workArea fuzzy-match. Windows sometimes shifts a display's
 * workArea origin by a few pixels after a DWM restart, driver update or taskbar move,
 * so exact equality would miss the right monitor.
 */
const BOUNDS_TOLERANCE = 8

type Rect = { x: number; y: number; width: number; height: number }

function boundsMatch(a: Rect, b: Rect): boolean {
  return (
    Math.abs(a.x - b.x) <= BOUNDS_TOLERANCE &&
    Math.abs(a.y - b.y) <= BOUNDS_TOLERANCE &&
    Math.abs(a.width - b.width) <= BOUNDS_TOLERANCE &&
    Math.abs(a.height - b.height) <= BOUNDS_TOLERANCE
  )
}

export function resolveDisplay(params: ResolveDisplayParams): DisplayInfo {
  const { displays, displayId, savedWorkArea, savedScaleFactor, currentBounds } = params
  let display: DisplayInfo | undefined

  // Tier 1: exact session-local id.
  if (displayId !== undefined) display = displays.find((d) => d.id === displayId)

  // Tier 2: cross-reboot fuzzy workArea match, scale factor as tiebreaker.
  if (!display && savedWorkArea) {
    const candidates = displays.filter((d) => boundsMatch(d.workArea, savedWorkArea))
    if (candidates.length === 1) display = candidates[0]
    else if (candidates.length > 1) {
      display = (savedScaleFactor !== undefined && candidates.find((d) => d.scaleFactor === savedScaleFactor)) || candidates[0]
    }
  }

  // Tier 3: nearest to the window's current position (only when nothing was ever saved).
  if (!display && displayId === undefined && currentBounds) {
    display = findNearestDisplay(displays, currentBounds)
  }

  // Tier 4: primary, else the first display.
  return display ?? displays.find((d) => d.isPrimary) ?? displays[0]
}

export function computeNotchBounds(params: NotchBoundsParams): NotchBoundsResult {
  const display = resolveDisplay(params)
  const wa = display.workArea
  const width = Math.min(params.windowWidth, wa.width)
  const height = Math.min(params.windowHeight, wa.height)
  return {
    x: wa.x + Math.round((wa.width - width) / 2),
    y: wa.y,
    width,
    height,
    displayId: display.id,
    resolvedDisplay: display
  }
}

function findNearestDisplay(displays: DisplayInfo[], point: { x: number; y: number }): DisplayInfo | undefined {
  let nearest: DisplayInfo | undefined
  let minDist = Infinity
  for (const d of displays) {
    const dx = d.workArea.x + d.workArea.width / 2 - point.x
    const dy = d.workArea.y + d.workArea.height / 2 - point.y
    const dist = dx * dx + dy * dy
    if (dist < minDist) {
      minDist = dist
      nearest = d
    }
  }
  return nearest
}
