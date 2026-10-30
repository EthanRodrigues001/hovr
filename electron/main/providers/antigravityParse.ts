/**
 * Maps Google Cloud Code's `retrieveUserQuotaSummary` / `fetchAvailableModels`
 * responses (what Antigravity reads) to usage windows. Pure: no I/O.
 *
 * Buckets report `remainingFraction` (0-1 REMAINING), so used = (1 - fraction) * 100.
 * Port of T3's `summaryWindows` / `modelWindows`.
 */
import type { UsageWindow, UsageWindowKind } from '../../../shared/usage'
import { isRecord } from './util'

const WEEK_MINS = 7 * 24 * 60
const SESSION_MINS = 5 * 60

function iso(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v) return undefined
  const ms = Date.parse(v)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined
}

function quotaWindow(
  id: string,
  label: string,
  quota: Record<string, unknown>,
  kind: UsageWindowKind,
  windowDurationMins?: number
): UsageWindow | undefined {
  const fraction = quota.remainingFraction
  if (typeof fraction !== 'number' || !Number.isFinite(fraction)) return undefined
  const resetsAt = iso(quota.resetTime)
  return {
    id,
    label,
    kind,
    usedPercent: (1 - Math.max(0, Math.min(1, fraction))) * 100,
    ...(resetsAt ? { resetsAt } : {}),
    ...(windowDurationMins === undefined ? {} : { windowDurationMins })
  }
}

/** Keep each id's most-used reading (endpoints can disagree). */
export function mergeWindowsByMaxUsed(windows: Iterable<UsageWindow>): UsageWindow[] {
  const out = new Map<string, UsageWindow>()
  for (const w of windows) {
    const prev = out.get(w.id)
    if (!prev || w.usedPercent > prev.usedPercent) out.set(w.id, w)
  }
  return [...out.values()]
}

export function parseQuotaSummary(body: unknown): UsageWindow[] {
  if (!isRecord(body)) return []
  const groups: { displayName?: unknown; buckets?: unknown }[] = []
  const rawGroups = Array.isArray(body.groups) ? body.groups.filter(isRecord) : []
  if (rawGroups.some((g) => Array.isArray(g.buckets) && g.buckets.length > 0)) groups.push(...rawGroups)
  else groups.push({ buckets: body.buckets })

  const windows: UsageWindow[] = []
  for (const group of groups) {
    for (const bucket of Array.isArray(group.buckets) ? group.buckets : []) {
      if (!isRecord(bucket) || typeof bucket.bucketId !== 'string' || !bucket.bucketId) continue
      if (bucket.disabled === true) continue
      const groupName = typeof group.displayName === 'string' ? group.displayName.trim() : ''
      const family = bucket.bucketId.startsWith('gemini-')
        ? 'Gemini'
        : bucket.bucketId.startsWith('3p-')
          ? 'Claude & GPT (shared)'
          : groupName || bucket.bucketId
      const weekly = bucket.window === 'weekly'
      const session = bucket.window === '5h'
      const display = typeof bucket.displayName === 'string' ? bucket.displayName.trim() : ''
      const w = quotaWindow(
        bucket.bucketId,
        `${family} · ${weekly ? 'Weekly' : session ? '5-hour' : display || 'Quota'}`,
        bucket,
        weekly ? 'weekly' : session ? 'session' : 'other',
        weekly ? WEEK_MINS : session ? SESSION_MINS : undefined
      )
      if (w) windows.push(w)
    }
  }
  return mergeWindowsByMaxUsed(windows)
}

/** Older accounts expose model quotas without a window length; no cadence is invented. */
export function parseAvailableModels(body: unknown): UsageWindow[] {
  const models = isRecord(body) && isRecord(body.models) ? body.models : undefined
  if (!models) return []
  const windows: UsageWindow[] = []
  for (const [modelId, model] of Object.entries(models)) {
    if (!isRecord(model)) continue
    const provider = model.modelProvider
    const family =
      provider === 'MODEL_PROVIDER_GOOGLE' || modelId.startsWith('gemini-')
        ? 'Gemini'
        : provider === 'MODEL_PROVIDER_ANTHROPIC' || modelId.startsWith('claude-')
          ? 'Claude'
          : provider === 'MODEL_PROVIDER_OPENAI' || modelId.startsWith('gpt-')
            ? 'GPT'
            : undefined
    if (!family) continue
    for (const [suffix, quota] of [
      ['quota', model.quotaInfo],
      ['weekly', model.weeklyQuotaInfo]
    ] as const) {
      if (!isRecord(quota)) continue
      const w = quotaWindow(
        `${family.toLowerCase()}-${suffix}`,
        `${family} · ${suffix === 'weekly' ? 'Weekly' : 'Reported quota'}`,
        quota,
        suffix === 'weekly' ? 'weekly' : 'other',
        suffix === 'weekly' ? WEEK_MINS : undefined
      )
      if (w) windows.push(w)
    }
  }
  return mergeWindowsByMaxUsed(windows)
}
