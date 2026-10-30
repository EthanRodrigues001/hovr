/**
 * Maps ChatGPT's `GET /backend-api/wham/usage` JSON (what Codex's own usage screen
 * reads) to `UsageLimits`. Pure: no I/O.
 *
 * `primary_window` / `secondary_window` are positions, not meanings: a paid plan has
 * a 5 hour primary and weekly secondary, Free/Go have a single monthly primary. The
 * window length the server reports decides the kind, with plan-based fallbacks.
 */
import type { UsageLimits, UsageWindow, UsageWindowKind } from '../../../shared/usage'
import { clampPercent, makeUnavailableLimits, makeUsageLimits } from '../../../shared/usageMath'

const SESSION_MINS = 5 * 60
const WEEK_MINS = 7 * 24 * 60
const MONTH_MINS = 30 * 24 * 60

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isoFromEpochSeconds(v: unknown): string | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? new Date(v * 1000).toISOString() : undefined
}

function kindForDuration(mins: number): UsageWindowKind {
  if (mins >= MONTH_MINS) return 'monthly'
  if (mins >= WEEK_MINS) return 'weekly'
  return 'session'
}

const LABELS: Record<UsageWindowKind, string> = {
  session: 'Session',
  weekly: 'Weekly',
  monthly: 'Monthly',
  other: 'Other'
}

export function codexPlanLabel(plan: unknown): string | undefined {
  if (typeof plan !== 'string' || !plan.trim()) return undefined
  const p = plan.trim()
  return p.charAt(0).toUpperCase() + p.slice(1)
}

export function parseCodexUsage(body: unknown, checkedAt: string): UsageLimits {
  if (!isRecord(body)) {
    return makeUnavailableLimits({ checkedAt, reason: 'probeFailed', message: 'Unexpected response.' })
  }
  const planType = typeof body.plan_type === 'string' ? body.plan_type : undefined
  const monthlyPlan = planType === 'free' || planType === 'go'
  const rate = isRecord(body.rate_limit) ? body.rate_limit : undefined

  const windows: UsageWindow[] = []
  const positions = [
    ['primary', rate?.primary_window, monthlyPlan ? MONTH_MINS : SESSION_MINS],
    ['secondary', rate?.secondary_window, WEEK_MINS]
  ] as const
  for (const [id, w, fallbackMins] of positions) {
    if (!isRecord(w) || typeof w.used_percent !== 'number' || !Number.isFinite(w.used_percent)) continue
    const mins =
      typeof w.limit_window_seconds === 'number' && w.limit_window_seconds > 0
        ? w.limit_window_seconds / 60
        : fallbackMins
    const kind = kindForDuration(mins)
    const resetsAt = isoFromEpochSeconds(w.reset_at)
    windows.push({
      id,
      kind,
      label: LABELS[kind],
      usedPercent: clampPercent(w.used_percent),
      windowDurationMins: mins,
      ...(resetsAt ? { resetsAt } : {})
    })
  }

  const account = typeof body.email === 'string' && body.email ? body.email : undefined
  const plan = codexPlanLabel(planType)
  const meta = { ...(account ? { account } : {}), ...(plan ? { plan } : {}) }

  return windows.length > 0
    ? { ...makeUsageLimits({ checkedAt, windows }), ...meta }
    : { ...makeUnavailableLimits({ checkedAt, reason: 'unsupported', message: 'No Codex limits on this plan.' }), ...meta }
}
