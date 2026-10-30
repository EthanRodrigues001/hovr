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
    try {
      const probed = await driver.read()
      const next = resolveAfterProbe({ published: usage[driver.id], probed })
      if (next) usage[driver.id] = next
      if (probed.unavailable?.reason === 'probeFailed') {
        probeErrors.set(driver.id, probed.unavailable.message ?? 'Could not read limits.')
      } else {
        probeErrors.delete(driver.id)
      }
    } catch {
      /* readers never throw; a defect here must not take the loop down */
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
export function refreshUsage(): Promise<void> {
  if (running) {
    rerun = true
    return running
  }
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
