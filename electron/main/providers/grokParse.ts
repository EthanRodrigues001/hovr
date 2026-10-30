/**
 * Maps Grok's `GET cli-chat-proxy.grok.com/v1/billing?format=credits` response to
 * `UsageLimits`. Pure: no I/O. Port of T3's `grokUsageResponseToLimits`.
 *
 * The response describes one subscription period; its type decides the window kind.
 * Grok omits a zero percentage but keeps the period, so a valid period with no
 * percentage means 0% used.
 */
import type { UsageLimits, UsageWindow, UsageWindowKind } from '../../../shared/usage'
import { clampPercent, makeUnavailableLimits, makeUsageLimits } from '../../../shared/usageMath'
import { isRecord } from './util'

const LABELS: Record<UsageWindowKind, string> = {
  session: 'Session',
  weekly: 'Weekly',
  monthly: 'Monthly',
  other: 'Subscription'
}

function parseMs(value: unknown): number {
  return typeof value === 'string' && value ? Date.parse(value) : Number.NaN
}

export function parseGrokUsage(body: unknown, checkedAt: string): UsageLimits {
  if (!isRecord(body)) {
    return makeUnavailableLimits({ checkedAt, reason: 'probeFailed', message: 'Unexpected response.' })
  }
  const config = isRecord(body.config) ? body.config : undefined
  const period = config && isRecord(config.currentPeriod) ? config.currentPeriod : undefined
  const periodType = typeof period?.type === 'string' ? period.type.replace(/^USAGE_PERIOD_TYPE_/, '') : ''
  const kind: UsageWindowKind = periodType === 'WEEKLY' ? 'weekly' : periodType === 'MONTHLY' ? 'monthly' : 'other'

  let used = typeof config?.creditUsagePercent === 'number' ? config.creditUsagePercent : undefined
  if (used === undefined && kind !== 'other' && parseMs(period?.start) < parseMs(period?.end)) used = 0
  if (used === undefined || !Number.isFinite(used)) {
    return makeUnavailableLimits({ checkedAt, reason: 'unsupported', message: 'No Grok limits reported.' })
  }

  const endMs = parseMs(period?.end)
  const window: UsageWindow = {
    id: 'subscription',
    kind,
    label: LABELS[kind],
    usedPercent: clampPercent(used),
    ...(Number.isFinite(endMs) ? { resetsAt: new Date(endMs).toISOString() } : {})
  }
  return makeUsageLimits({ checkedAt, windows: [window] })
}
