/**
 * Maps OpenCode Go's `GET opencode.ai/zen/go/v1/usage` response to `UsageLimits`.
 * Pure: no I/O. Port of T3's window set: a 5 hour rolling session, weekly, monthly.
 */
import type { UsageLimits, UsageWindow } from '../../../shared/usage'
import { clampPercent, makeUnavailableLimits, makeUsageLimits } from '../../../shared/usageMath'
import { isRecord } from './util'

const SPECS = [
  { key: 'rolling', id: 'go_rolling', kind: 'session', label: 'Go · Session', mins: 5 * 60 },
  { key: 'weekly', id: 'go_weekly', kind: 'weekly', label: 'Go · Weekly', mins: 7 * 24 * 60 },
  { key: 'monthly', id: 'go_monthly', kind: 'monthly', label: 'Go · Monthly', mins: undefined }
] as const

export function parseOpenCodeGoUsage(body: unknown, checkedAt: string): UsageLimits {
  const usage = isRecord(body) && isRecord(body.usage) ? body.usage : undefined
  if (!usage) {
    return makeUnavailableLimits({ checkedAt, reason: 'probeFailed', message: 'Unexpected response.' })
  }
  const windows: UsageWindow[] = []
  for (const spec of SPECS) {
    const w = usage[spec.key]
    if (!isRecord(w) || typeof w.percent !== 'number' || !Number.isFinite(w.percent)) continue
    const resetMs = typeof w.resetsAt === 'string' ? Date.parse(w.resetsAt) : Number.NaN
    windows.push({
      id: spec.id,
      kind: spec.kind,
      label: spec.label,
      usedPercent: clampPercent(w.percent),
      ...(spec.mins ? { windowDurationMins: spec.mins } : {}),
      ...(Number.isFinite(resetMs) ? { resetsAt: new Date(resetMs).toISOString() } : {})
    })
  }
  return windows.length > 0
    ? makeUsageLimits({ checkedAt, windows })
    : makeUnavailableLimits({ checkedAt, reason: 'probeFailed', message: 'OpenCode Go returned no windows.' })
}
