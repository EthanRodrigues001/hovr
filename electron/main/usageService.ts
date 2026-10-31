/**
 * Detection + usage refresh loop.
 *
 * One refresh = for every driver: detect (cheap, local), then, if the tool is
 * installed and enabled, read its limits. A refresh never overlaps another (a slow,
 * stale read can't overwrite a newer one) and `resolveAfterProbe` keeps the last
 * good bars on transient failures. State is pushed to the renderer only when it
 * actually changed.
 */
import type { ProviderId, ProviderStatus, UsageLimits, UsageState } from '../../shared/usage'
import { resolveAfterProbe } from '../../shared/usageMath'
import { loadSettings } from '../store/settings'
import { pushState } from './state'
import { DRIVERS } from './providers/registry'
import { checkAlerts } from './alerts'
import { recordSamples } from './usageSamples'

const usage: Partial<Record<ProviderId, UsageLimits>> = {}
/** Message of the last transient read failure, cleared by the next success. */
const probeErrors = new Map<ProviderId, string>()
let providers: ProviderStatus[] = []
let lastPublished = ''
let running: Promise<void> | null = null
let rerun = false
let timer: NodeJS.Timeout | null = null

/**
 * Be gentle with the providers' (undocumented) usage endpoints. Anything that triggers a refresh —
 * toggling a tool, the tray, the refresh button, the timer, a dev restart — would otherwise hit
 * every endpoint, and Claude's starts answering 429. So each tool is read at most once per
 * `minGap`, and a 429 backs off exponentially (10 min, 20, 40 … up to an hour) instead of retrying.
 */
const MIN_GAP_MS: Partial<Record<ProviderId, number>> = { claude: 5 * 60_000 }
const DEFAULT_GAP_MS = 60_000
const MANUAL_GAP_MS = 30_000
const BACKOFF_START_MS = 10 * 60_000
const BACKOFF_MAX_MS = 60 * 60_000
const lastRead = new Map<ProviderId, number>()
const cooldownUntil = new Map<ProviderId, number>()
const rateLimitHits = new Map<ProviderId, number>()
let forceNext = false

function minutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000))
}

export function getUsageState(): UsageState {
  return { usage: { ...usage }, providers: [...providers] }
}

async function refreshDriver(driver: (typeof DRIVERS)[number], disabled: ReadonlySet<string>): Promise<ProviderStatus> {
  const enabled = !disabled.has(driver.id)
  let detection
  try {
    detection = await driver.detect()
  } catch {
    detection = { installed: false, authState: 'unknown' as const }
  }

  if (!enabled || !detection.installed) {
    delete usage[driver.id]
    probeErrors.delete(driver.id)
  } else if (driver.supportsLimits) {
    const now = Date.now()
    const gap = forceNext ? MANUAL_GAP_MS : (MIN_GAP_MS[driver.id] ?? DEFAULT_GAP_MS)
    const coolUntil = cooldownUntil.get(driver.id) ?? 0
    if (coolUntil > now) {
      // Rate limited earlier: leave the endpoint alone and keep showing the last reading.
      probeErrors.set(driver.id, `Rate limited. Next try in ${minutes(coolUntil - now)} min.`)
    } else if (usage[driver.id] && now - (lastRead.get(driver.id) ?? 0) < gap - 10_000) {
      // Read recently enough; reuse it.
    } else {
      lastRead.set(driver.id, now)
      try {
        const probed = await driver.read()
        const next = resolveAfterProbe({ published: usage[driver.id], probed })
        if (next) usage[driver.id] = next
        const message = probed.unavailable?.message ?? ''
        if (probed.unavailable?.reason === 'probeFailed' && message.startsWith('Rate limited')) {
          const hits = (rateLimitHits.get(driver.id) ?? 0) + 1
          rateLimitHits.set(driver.id, hits)
          const wait = Math.min(BACKOFF_MAX_MS, BACKOFF_START_MS * 2 ** (hits - 1))
          cooldownUntil.set(driver.id, Date.now() + wait)
          probeErrors.set(driver.id, `Rate limited. Next try in ${minutes(wait)} min.`)
        } else if (probed.unavailable?.reason === 'probeFailed') {
          probeErrors.set(driver.id, message || 'Could not read limits.')
        } else {
          rateLimitHits.delete(driver.id)
          cooldownUntil.delete(driver.id)
          probeErrors.delete(driver.id)
        }
      } catch {
        /* readers never throw; a defect here must not take the loop down */
      }
    }
  }

  const limits = usage[driver.id]
  const probeError = probeErrors.get(driver.id)
  return {
    id: driver.id,
    label: driver.label,
    installed: detection.installed,
    authState: detection.authState,
    enabled,
    supportsLimits: driver.supportsLimits,
    ...(detection.hint ? { hint: detection.hint } : {}),
    ...(limits?.account ? { account: limits.account } : {}),
    ...(limits?.plan ? { plan: limits.plan } : {}),
    ...(probeError || limits?.unavailable?.message
      ? { lastError: probeError ?? limits?.unavailable?.message }
      : {}),
    ...(probeError && limits && limits.windows.length > 0 ? { stale: true } : {}),
    ...(limits ? { checkedAt: limits.checkedAt } : {})
  }
}

async function runRefresh(): Promise<void> {
  const disabled = new Set(loadSettings().disabledProviders)
  providers = await Promise.all(DRIVERS.map((d) => refreshDriver(d, disabled)))
  const state = getUsageState()
  void recordSamples(state)
  checkAlerts(state)
  const serialized = JSON.stringify(state)
  if (serialized !== lastPublished) {
    lastPublished = serialized
    pushState.usage(state)
  }
}

/** Refresh everything now. Calls made during a run schedule exactly one follow-up run. */
export function refreshUsage(manual = false): Promise<void> {
  if (running) {
    rerun = true
    return running
  }
  forceNext = manual
  running = runRefresh()
    .catch(() => {
      /* keep the loop alive */
    })
    .finally(() => {
      running = null
      if (rerun) {
        rerun = false
        void refreshUsage()
      }
    })
  return running
}

function schedule(): void {
  if (timer) clearInterval(timer)
  const minutes = loadSettings().usageRefreshMinutes
  timer = setInterval(() => void refreshUsage(), minutes * 60_000)
}

/** Call after settings change so toggles and the interval take effect immediately. */
export function onUsageSettingsChanged(): void {
  schedule()
  void refreshUsage()
}

export function startUsageService(): void {
  void refreshUsage()
  schedule()
}

export function stopUsageService(): void {
  if (timer) clearInterval(timer)
  timer = null
}
