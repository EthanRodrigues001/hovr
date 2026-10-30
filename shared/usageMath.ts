/**
 * Pure usage-limit logic: no I/O, no Electron. Everything takes `now` explicitly
 * so it is deterministic under test.
 */
import type {
  LimitPace,
  UsageLimits,
  UsageUnavailableReason,
  UsageWindow,
  UsageWindowKind
} from './usage'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Gap (percentage points) between used share and elapsed share beyond which pace is off. */
const PACE_TOLERANCE = 5

const KIND_RANK: Record<UsageWindowKind, number> = { session: 0, weekly: 1, monthly: 2, other: 3 }

export function clampPercent(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
}

export function sortWindows(windows: Iterable<UsageWindow>): UsageWindow[] {
  return [...windows].sort(
    (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.id.localeCompare(b.id)
  )
}

export function makeUsageLimits(input: {
  checkedAt: string
  windows: Iterable<UsageWindow>
}): UsageLimits {
  return { checkedAt: input.checkedAt, windows: sortWindows(input.windows) }
}

export function makeUnavailableLimits(input: {
  checkedAt: string
  reason: UsageUnavailableReason
  message?: string
}): UsageLimits {
  return {
    checkedAt: input.checkedAt,
    windows: [],
    unavailable: { reason: input.reason, ...(input.message ? { message: input.message } : {}) }
  }
}

function windowEquals(a: UsageWindow, b: UsageWindow): boolean {
  return (
    a.id === b.id &&
    a.kind === b.kind &&
    a.label === b.label &&
    a.usedPercent === b.usedPercent &&
    a.resetsAt === b.resetsAt &&
    a.windowDurationMins === b.windowDurationMins
  )
}

/**
 * Merge a partial update into the previous snapshot by window id. A missing
 * `resetsAt` / `windowDurationMins` keeps the earlier value. Returns `previous`
 * (same reference) when nothing changed, so callers can skip republishing.
 */
export function mergeUsageUpdate(input: {
  previous: UsageLimits | undefined
  update: UsageWindow[]
  checkedAt: string
}): UsageLimits | undefined {
  const { previous, update, checkedAt } = input
  if (update.length === 0 || previous?.unavailable?.reason === 'unsupported') return previous
  const merged = new Map(previous?.windows.map((w) => [w.id, w] as const))
  let changed = false
  for (const window of update) {
    const existing = merged.get(window.id)
    const next: UsageWindow = {
      ...window,
      usedPercent: clampPercent(window.usedPercent),
      ...(window.resetsAt === undefined && existing?.resetsAt !== undefined
        ? { resetsAt: existing.resetsAt }
        : {}),
      ...(window.windowDurationMins === undefined && existing?.windowDurationMins !== undefined
        ? { windowDurationMins: existing.windowDurationMins }
        : {})
    }
    if (!existing || !windowEquals(existing, next)) {
      merged.set(window.id, next)
      changed = true
    }
  }
  if (!changed && previous) return previous
  const unavailable =
    previous === undefined ? { reason: 'probeFailed' as const } : previous.unavailable
  return {
    ...makeUsageLimits({ checkedAt, windows: merged.values() }),
    ...(previous?.credentialFingerprint
      ? { credentialFingerprint: previous.credentialFingerprint }
      : {}),
    ...(previous?.account ? { account: previous.account } : {}),
    ...(previous?.plan ? { plan: previous.plan } : {}),
    ...(unavailable ? { unavailable } : {})
  }
}

/**
 * Decide what to publish after a probe. A transient failure keeps the last good
 * bars; a probe older than the published snapshot never overwrites it.
 */
export function resolveAfterProbe(input: {
  published: UsageLimits | undefined
  probed: UsageLimits | undefined
}): UsageLimits | undefined {
  const { published, probed } = input
  if (probed?.unavailable?.reason === 'probeFailed' && published && !published.unavailable) {
    return published
  }
  if (
    published &&
    probed &&
    !published.unavailable &&
    !probed.unavailable &&
    Date.parse(published.checkedAt) > Date.parse(probed.checkedAt)
  ) {
    return { ...probed, checkedAt: published.checkedAt, windows: published.windows }
  }
  return probed
}

/** Text for the empty / error state of a provider card, or null when bars exist. */
export function limitsNotice(limits: UsageLimits): string | null {
  if (limits.unavailable?.reason === 'unsupported') {
    return limits.unavailable.message ?? 'This account has no subscription limits.'
  }
  if (limits.unavailable?.reason === 'probeFailed') {
    return limits.unavailable.message ?? 'Could not read limits.'
  }
  return limits.windows.length === 0 ? 'No limits reported.' : null
}

export function remainingPercent(window: UsageWindow): number {
  return Math.round(100 - clampPercent(window.usedPercent))
}

function resetMillis(window: UsageWindow): number | null {
  if (window.resetsAt === undefined) return null
  const at = Date.parse(window.resetsAt)
  return Number.isFinite(at) ? at : null
}

/** Fraction (0-1) of the window already elapsed, or null without a reset time and duration. */
export function elapsedShare(window: UsageWindow, now: number): number | null {
  const resetsAt = resetMillis(window)
  if (resetsAt === null || window.windowDurationMins === undefined) return null
  const length = window.windowDurationMins * MINUTE
  if (length <= 0) return null
  return Math.max(0, Math.min(1, (length - (resetsAt - now)) / length))
}

/** Where the remaining bar would sit if spending were perfectly even. */
export function paceRemainingPercent(window: UsageWindow, now: number): number | null {
  const elapsed = elapsedShare(window, now)
  return elapsed === null ? null : Math.round((1 - elapsed) * 100)
}

export function paceOf(window: UsageWindow, now: number): LimitPace | null {
  const elapsed = elapsedShare(window, now)
  if (elapsed === null) return null
  const gap = window.usedPercent - elapsed * 100
  if (gap > PACE_TOLERANCE) return 'ahead'
  if (gap < -PACE_TOLERANCE) return 'under'
  return 'on'
}

export function formatDuration(ms: number): string {
  const remaining = Math.max(0, ms)
  const days = Math.floor(remaining / DAY)
  const hours = Math.floor((remaining % DAY) / HOUR)
  const minutes = Math.floor((remaining % HOUR) / MINUTE)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatResetsIn(window: UsageWindow, now: number): string | null {
  const resetsAt = resetMillis(window)
  if (resetsAt === null) return null
  if (resetsAt <= now) return 'resets now'
  if (resetsAt - now < MINUTE) return 'resets momentarily'
  return `resets in ${formatDuration(resetsAt - now)}`
}

/** Lowest remaining share across windows: the headline number for a collapsed notch. */
export function worstRemainingPercent(windows: readonly UsageWindow[]): number | null {
  return windows.length === 0 ? null : Math.min(...windows.map(remainingPercent))
}
