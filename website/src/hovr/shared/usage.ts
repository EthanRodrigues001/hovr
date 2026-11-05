/**
 * Usage-limit domain types shared by main and renderer.
 *
 * A provider (Claude, Codex, Cursor, ...) reports a list of `UsageWindow`s: one bar
 * each (a session, a week, a month). Window ids are stable per provider so a sparse
 * update can be merged into an earlier full read (see usageMath.mergeUsageUpdate).
 */

/** Display rank: session < weekly < monthly < other. */
export type UsageWindowKind = 'session' | 'weekly' | 'monthly' | 'other'

export interface UsageWindow {
  /** Stable per provider, e.g. "five_hour", "seven_day", "go_weekly". */
  id: string
  kind: UsageWindowKind
  label: string
  /** 0-100, how much of the allowance is used. The UI shows the remaining share. */
  usedPercent: number
  /** ISO timestamp the window resets at, when known. */
  resetsAt?: string
  /** Full length of the window; needed to compute pace. */
  windowDurationMins?: number
}

/**
 * `unsupported`: the account has no limits (or they cannot be read), so bars are cleared.
 * `probeFailed`: a transient failure, so the last good bars are kept.
 */
export type UsageUnavailableReason = 'unsupported' | 'probeFailed'

export interface UsageLimits {
  /** ISO timestamp of the read. */
  checkedAt: string
  windows: UsageWindow[]
  /** Hash identifying the account, so the same account seen twice can be pooled. */
  credentialFingerprint?: string
  /** Account label (usually email) when the source reports one. */
  account?: string
  /** Plan / tier label, e.g. "Pro", "Free". */
  plan?: string
  unavailable?: { reason: UsageUnavailableReason; message?: string }
}

/** Providers hovr knows about (Phases 2-4b). */
export type ProviderId =
  | 'claude'
  | 'codex'
  | 'antigravity'
  | 'cursor'
  | 'grok'
  | 'opencode'
  | 'muse'
  | 'pi'
  | 'fx'
  | 'devin'
  | 'droid'
  | 'copilot'
  | 'gemini'

export type ProviderAuthState = 'authenticated' | 'unauthenticated' | 'unknown'

export interface ProviderStatus {
  id: ProviderId
  label: string
  installed: boolean
  authState: ProviderAuthState
  /** User toggle (Settings). Disabled providers are not read or shown. */
  enabled: boolean
  /** False for detect-only tools where no limit source is known. */
  supportsLimits: boolean
  /** What to do next, e.g. "Run `claude` and sign in." */
  hint?: string
  /** Account label (email) when known. */
  account?: string
  plan?: string
  /** Message from the last failed or unsupported read. */
  lastError?: string
  /** True when the last read failed but earlier bars are still being shown. */
  stale?: boolean
  /** ISO time of the last completed read. */
  checkedAt?: string
}

export type LimitPace = 'ahead' | 'on' | 'under'

/** Everything the renderer needs: latest bars per provider plus provider statuses. */
export interface UsageState {
  usage: Partial<Record<ProviderId, UsageLimits>>
  providers: ProviderStatus[]
}

/** One reading of a window's used %, kept locally to draw real usage curves. */
export interface UsageSample {
  t: number
  used: number
}
