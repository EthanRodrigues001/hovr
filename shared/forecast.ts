/**
 * Forecast: where a usage window will be when it resets if the spending pace so far
 * holds. Pure math on one reading (used % + reset time + window length), so it needs
 * no stored history; the projection is "average pace since the window opened".
 */
import type { UsageWindow } from './usage'

const MINUTE = 60_000

/** Below this share of the window elapsed the pace is too noisy to extrapolate. */
const MIN_ELAPSED_SHARE = 0.02

export interface Forecast {
  startsAt: number
  resetsAt: number
  /** Used now, 0-100. */
  usedNow: number
  /** Share of the window elapsed, 0-1. */
  elapsed: number
  /** Projected used % at reset, uncapped (150 means 50% over). null: too early to say. */
  projectedAtReset: number | null
  /** When the allowance hits 100% if the pace holds; null when it lasts until reset. */
  runOutAt: number | null
  /** Time between running out and the reset. */
  lockedMs: number
  /** Current pace relative to an even spend (1 = exactly even). null: too early. */
  paceRatio: number | null
}

export function forecastOf(window: UsageWindow, now: number): Forecast | null {
  if (!window.resetsAt || window.windowDurationMins === undefined || window.windowDurationMins <= 0) return null
  const resetsAt = Date.parse(window.resetsAt)
  if (!Number.isFinite(resetsAt)) return null
  const length = window.windowDurationMins * MINUTE
  const startsAt = resetsAt - length
  const elapsed = Math.max(0, Math.min(1, (now - startsAt) / length))
  const usedNow = Math.max(0, Math.min(100, window.usedPercent))

  const base: Forecast = {
    startsAt,
    resetsAt,
    usedNow,
    elapsed,
    projectedAtReset: null,
    runOutAt: null,
    lockedMs: 0,
    paceRatio: null
  }
  if (usedNow >= 100) return { ...base, projectedAtReset: 100, runOutAt: now, lockedMs: Math.max(0, resetsAt - now), paceRatio: null }
  if (elapsed < MIN_ELAPSED_SHARE) return base

  const ratePerMs = usedNow / (elapsed * length)
  const projectedAtReset = usedNow + ratePerMs * Math.max(0, resetsAt - now)
  const paceRatio = usedNow / (elapsed * 100)
  if (ratePerMs <= 0 || projectedAtReset < 100.5) return { ...base, projectedAtReset, paceRatio }
  const runOutAt = now + (100 - usedNow) / ratePerMs
  return { ...base, projectedAtReset, runOutAt, lockedMs: Math.max(0, resetsAt - runOutAt), paceRatio }
}

/** Projected used % at time `t` (clamped to 0-100) following the current pace. */
export function projectedUsedAt(f: Forecast, t: number, now: number): number {
  if (t <= now || f.projectedAtReset === null) return f.usedNow
  const span = f.resetsAt - now
  if (span <= 0) return f.usedNow
  const slope = (f.projectedAtReset - f.usedNow) / span
  return Math.max(0, Math.min(100, f.usedNow + slope * (t - now)))
}
