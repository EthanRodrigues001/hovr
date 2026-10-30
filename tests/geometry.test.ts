import { describe, it, expect } from 'vitest'
import { computeNotchBounds, type DisplayInfo } from '../electron/main/geometry'

function makeDisplay(id: number, x: number, y: number, w: number, h: number, extra: Partial<DisplayInfo> = {}): DisplayInfo {
  return { id, workArea: { x, y, width: w, height: h }, ...extra }
}

const primary = makeDisplay(1, 0, 0, 1920, 1080, { isPrimary: true })
const right = makeDisplay(2, 1920, 0, 1920, 1080)
const negX = makeDisplay(3, -1920, 0, 1920, 1080)
const base = { windowWidth: 760, windowHeight: 660 }

describe('computeNotchBounds', () => {
  it('centres on the top of the primary display', () => {
    const r = computeNotchBounds({ ...base, displays: [primary] })
    expect(r).toMatchObject({ x: 580, y: 0, width: 760, height: 660, displayId: 1 })
  })

  it('centres on a display to the right', () => {
    const r = computeNotchBounds({ ...base, displays: [primary, right], displayId: 2 })
    expect(r).toMatchObject({ x: 1920 + 580, y: 0, displayId: 2 })
  })

  it('works on a display with negative x', () => {
    const r = computeNotchBounds({ ...base, displays: [primary, negX], displayId: 3 })
    expect(r.x).toBe(-1920 + 580)
  })

  it('sits below a top taskbar (work area y > 0)', () => {
    const r = computeNotchBounds({ ...base, displays: [makeDisplay(1, 0, 48, 1920, 1032, { isPrimary: true })] })
    expect(r.y).toBe(48)
  })

  it('clamps the window to a small work area', () => {
    const r = computeNotchBounds({ ...base, displays: [makeDisplay(1, 0, 0, 600, 500, { isPrimary: true })] })
    expect(r).toMatchObject({ x: 0, width: 600, height: 500 })
  })

  it('falls back to the nearest display when the saved id is gone', () => {
    const r = computeNotchBounds({ ...base, displays: [primary, right], displayId: 99, currentBounds: { x: 2000, y: 100 } })
    // An id was saved but missing, so the nearest-display tier is skipped: primary wins.
    expect(r.displayId).toBe(1)
  })

  it('uses the nearest display when nothing was ever saved', () => {
    const r = computeNotchBounds({ ...base, displays: [primary, right], currentBounds: { x: 2000, y: 100 } })
    expect(r.displayId).toBe(2)
  })

  it('falls back to primary with no saved data', () => {
    const r = computeNotchBounds({ ...base, displays: [right, primary] })
    expect(r.displayId).toBe(1)
  })

  it('re-finds a display by saved work area after ids change (within tolerance)', () => {
    const renumbered = [makeDisplay(10, 0, 0, 1920, 1080, { isPrimary: true }), makeDisplay(11, 1920, 2, 1918, 1080)]
    const r = computeNotchBounds({
      ...base,
      displays: renumbered,
      displayId: 2,
      savedWorkArea: { x: 1920, y: 0, width: 1920, height: 1080 }
    })
    expect(r.displayId).toBe(11)
  })

  it('breaks identical-geometry ties by scale factor', () => {
    const a = makeDisplay(10, 0, 0, 1920, 1080, { scaleFactor: 1, isPrimary: true })
    const b = makeDisplay(11, 0, 0, 1920, 1080, { scaleFactor: 1.5 })
    const r = computeNotchBounds({
      ...base,
      displays: [a, b],
      displayId: 99,
      savedWorkArea: { x: 0, y: 0, width: 1920, height: 1080 },
      savedScaleFactor: 1.5
    })
    expect(r.displayId).toBe(11)
  })

  it('exposes the resolved display for persistence', () => {
    const r = computeNotchBounds({ ...base, displays: [primary] })
    expect(r.resolvedDisplay).toBe(primary)
  })
})
