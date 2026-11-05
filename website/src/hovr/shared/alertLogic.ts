import type { UsageWindow } from './usage'

/**
 * True when `w` is a different window from the one last seen (`prev`).
 * Providers report the reset time with a few seconds of jitter, so a changed reset
 * time alone does not mean a new window: it must jump forward by about a window
 * length, or usage must fall sharply.
 */
export function isNewWindow(prev: { resetsAt: number; used: number }, w: UsageWindow): boolean {
  const resetsAt = w.resetsAt ? Date.parse(w.resetsAt) : NaN
  const length = (w.windowDurationMins ?? 0) * 60_000
  const jumped = Number.isFinite(resetsAt) && length > 0 && resetsAt - prev.resetsAt > length * 0.5
  const droppedSharply = prev.used - w.usedPercent > 30
  return jumped || droppedSharply
}
