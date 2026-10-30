/**
 * Provider driver contract. One driver per AI tool; the registry runs them all.
 *
 * `detect()` answers "is this tool here and signed in" cheaply (file/PATH checks,
 * no network). `read()` fetches live limits and never throws: failures come back
 * as `UsageLimits.unavailable` so a bad provider cannot break the others.
 */
import type { ProviderAuthState, ProviderId, UsageLimits } from '../../../shared/usage'

export interface ProviderDetection {
  installed: boolean
  authState: ProviderAuthState
  /** Short human hint for the Settings card, e.g. "Run `claude` and sign in". */
  hint?: string
}

export interface ProviderDriver {
  id: ProviderId
  label: string
  /** True when `read()` can ever return bars; detect-only drivers set false. */
  supportsLimits: boolean
  detect(env?: NodeJS.ProcessEnv): Promise<ProviderDetection>
  read(env?: NodeJS.ProcessEnv): Promise<UsageLimits>
}
