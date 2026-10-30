import { describe, expect, it } from 'vitest'
import { forecastOf, projectedUsedAt } from '../shared/forecast'
import type { UsageWindow } from '../shared/usage'

const HOUR = 3_600_000
const now = Date.UTC(2026, 9, 30, 12, 0, 0)

const win = (o: Partial<UsageWindow>): UsageWindow => ({
  id: 'w',
  kind: 'session',
  label: 'Session',
  usedPercent: 50,
  windowDurationMins: 600, // 10 h
  resetsAt: new Date(now + 5 * HOUR).toISOString(), // half elapsed
  ...o
})

describe('forecastOf', () => {
  it('returns null without a reset time or duration', () => {
    expect(forecastOf(win({ resetsAt: undefined }), now)).toBeNull()
    expect(forecastOf(win({ windowDurationMins: undefined }), now)).toBeNull()
    expect(forecastOf(win({ resetsAt: 'nope' }), now)).toBeNull()
  })

  it('an even pace lands exactly at 100% on reset and does not run out', () => {
    const f = forecastOf(win({}), now)!
    expect(f.elapsed).toBeCloseTo(0.5)
    expect(f.paceRatio).toBeCloseTo(1)
    expect(f.projectedAtReset).toBeCloseTo(100)
    expect(f.runOutAt).toBeNull()
  })

  it('a fast pace runs out before reset and reports the locked time', () => {
    const f = forecastOf(win({ usedPercent: 75 }), now)! // 75% in half the window
    expect(f.projectedAtReset).toBeCloseTo(150)
    expect(f.runOutAt).toBeCloseTo(now + (25 / 75) * 5 * HOUR)
    expect(f.lockedMs).toBeCloseTo(5 * HOUR - (25 / 75) * 5 * HOUR)
    expect(f.paceRatio).toBeCloseTo(1.5)
  })

  it('a slow pace lasts until reset', () => {
    const f = forecastOf(win({ usedPercent: 20 }), now)!
    expect(f.projectedAtReset).toBeCloseTo(40)
    expect(f.runOutAt).toBeNull()
  })

  it('an already-exhausted window is locked until reset', () => {
    const f = forecastOf(win({ usedPercent: 100 }), now)!
    expect(f.runOutAt).toBe(now)
    expect(f.lockedMs).toBe(5 * HOUR)
  })

  it('too early in the window makes no projection', () => {
    const f = forecastOf(win({ usedPercent: 3, resetsAt: new Date(now + 9.99 * HOUR).toISOString() }), now)!
    expect(f.projectedAtReset).toBeNull()
    expect(f.paceRatio).toBeNull()
  })
})

describe('short session example', () => {
  it('50% used 30 minutes into a 5-hour session runs out about 30 minutes from now', () => {
    const f = forecastOf(win({ windowDurationMins: 300, usedPercent: 50, resetsAt: new Date(now + 270 * 60_000).toISOString() }), now)!
    expect(f.runOutAt).toBeCloseTo(now + 30 * 60_000, -3)
    expect(f.lockedMs).toBeCloseTo(240 * 60_000, -3)
  })
})

describe('projectedUsedAt', () => {
  it('follows the pace line and clamps to 100', () => {
    const f = forecastOf(win({ usedPercent: 75 }), now)!
    expect(projectedUsedAt(f, now, now)).toBe(75)
    expect(projectedUsedAt(f, now + 2.5 * HOUR, now)).toBeCloseTo(100)
    expect(projectedUsedAt(f, f.resetsAt, now)).toBe(100)
  })
})
