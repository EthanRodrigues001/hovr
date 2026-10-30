/**
 * Maps Cursor's `DashboardService/GetCurrentPeriodUsage` response to `UsageLimits`.
 * Pure: no I/O. Port of T3's `cursorUsageResponseToLimits` behaviour.
 *
 * `totalPercentUsed` is the combined figure across both allowances, not a third
 * quota; `autoPercentUsed` is the Cursor-model pool, `apiPercentUsed` the pool the
 * Claude / GPT / Gemini models draw from. All three share the billing-cycle end.
 */
import type { UsageLimits, UsageWindow } from '../../../shared/usage'
import { clampPercent, makeUnavailableLimits, makeUsageLimits } from '../../../shared/usageMath'
import { isRecord } from './util'

const WINDOWS = [
  { id: 'totalPercentUsed', label: 'Overall' },
  { id: 'autoPercentUsed', label: 'Cursor Models' },
  { id: 'apiPercentUsed', label: 'Other Models' }
] as const

export function parseCursorUsage(body: unknown, checkedAt: string): UsageLimits {
  if (!isRecord(body)) {
    return makeUnavailableLimits({ checkedAt, reason: 'probeFailed', message: 'Unexpected response.' })
  }
  // Epoch milliseconds, delivered as a string or a number.
  const endMs = Number(body.billingCycleEnd)
  const resetsAt = Number.isFinite(endMs) && endMs > 0 ? new Date(endMs).toISOString() : undefined
  const plan = isRecord(body.planUsage) ? body.planUsage : undefined
  const windows: UsageWindow[] = []
  for (const { id, label } of WINDOWS) {
    const used = plan?.[id]
    if (typeof used !== 'number' || !Number.isFinite(used)) continue
    windows.push({
      id,
      kind: 'monthly',
      label,
      usedPercent: clampPercent(used),
      ...(resetsAt ? { resetsAt } : {})
    })
  }
  return windows.length > 0
    ? makeUsageLimits({ checkedAt, windows })
    : makeUnavailableLimits({ checkedAt, reason: 'unsupported' })
}
