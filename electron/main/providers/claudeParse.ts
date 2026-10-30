/**
 * Maps Anthropic's `GET /api/oauth/usage` JSON to `UsageLimits`. Pure: no I/O.
 *
 * The response carries many null/obfuscated keys we do not know. Only the shapes
 * below are read; everything else is ignored so drift cannot break the reader.
 * Percentages here are already 0-100.
 */
import type { UsageLimits, UsageWindow } from '../../../shared/usage'
import { clampPercent, makeUnavailableLimits, makeUsageLimits } from '../../../shared/usageMath'

const SESSION_MINS = 5 * 60
const WEEK_MINS = 7 * 24 * 60

const FIXED: Record<string, Pick<UsageWindow, 'kind' | 'label' | 'windowDurationMins'>> = {
  five_hour: { kind: 'session', label: 'Session', windowDurationMins: SESSION_MINS },
  seven_day: { kind: 'weekly', label: 'Weekly', windowDurationMins: WEEK_MINS },
  seven_day_opus: { kind: 'weekly', label: 'Weekly · Opus', windowDurationMins: WEEK_MINS },
  seven_day_sonnet: { kind: 'weekly', label: 'Weekly · Sonnet', windowDurationMins: WEEK_MINS }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isoOrUndefined(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v) return undefined
  const ms = Date.parse(v)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined
}

function scopedId(displayName: string): string {
  return `seven_day_${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
}

export function parseClaudeUsage(body: unknown, checkedAt: string): UsageLimits {
  if (!isRecord(body)) {
    return makeUnavailableLimits({ checkedAt, reason: 'probeFailed', message: 'Unexpected response.' })
  }
  const windows = new Map<string, UsageWindow>()

  for (const [id, meta] of Object.entries(FIXED)) {
    const w = body[id]
    if (!isRecord(w) || typeof w.utilization !== 'number') continue
    const resetsAt = isoOrUndefined(w.resets_at)
    windows.set(id, {
      id,
      ...meta,
      usedPercent: clampPercent(w.utilization),
      ...(resetsAt ? { resetsAt } : {})
    })
  }

  // Newer per-model weekly limits arrive in `limits[]`; fixed keys above win on duplicates.
  if (Array.isArray(body.limits)) {
    for (const entry of body.limits) {
      if (!isRecord(entry) || entry.kind !== 'weekly_scoped' || typeof entry.percent !== 'number') continue
      const scope = isRecord(entry.scope) ? entry.scope : undefined
      const model = scope && isRecord(scope.model) ? scope.model : undefined
      const name = model && typeof model.display_name === 'string' ? model.display_name : undefined
      if (!name) continue
      const id = scopedId(name)
      if (windows.has(id)) continue
      const resetsAt = isoOrUndefined(entry.resets_at)
      windows.set(id, {
        id,
        kind: 'weekly',
        label: `Weekly · ${name}`,
        windowDurationMins: WEEK_MINS,
        usedPercent: clampPercent(entry.percent),
        ...(resetsAt ? { resetsAt } : {})
      })
    }
  }

  // Extra-usage spend, only when the user enabled it and a monthly cap exists.
  const extra = body.extra_usage
  if (isRecord(extra) && extra.is_enabled === true) {
    const { used_credits: used, monthly_limit: limit, utilization } = extra
    const percent =
      typeof used === 'number' && typeof limit === 'number' && limit > 0
        ? (used / limit) * 100
        : typeof utilization === 'number'
          ? utilization
          : undefined
    if (percent !== undefined && Number.isFinite(percent)) {
      windows.set('monthly_spend', {
        id: 'monthly_spend',
        kind: 'monthly',
        label: 'Monthly spend',
        usedPercent: clampPercent(percent)
      })
    }
  }

  return windows.size > 0
    ? makeUsageLimits({ checkedAt, windows: windows.values() })
    : makeUnavailableLimits({ checkedAt, reason: 'unsupported' })
}
