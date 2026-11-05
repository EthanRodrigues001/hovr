/**
 * Validation for persisted settings. Pure, so it is unit-tested without Electron.
 * Unknown keys are dropped; every field falls back to `base` when missing or the
 * wrong type; numbers are clamped.
 */
import type { CollapsedStyle, Settings } from './types'

const COLLAPSED_STYLES: readonly CollapsedStyle[] = ['chips', 'compact']

function isRect(v: unknown): v is NonNullable<Settings['stickDisplayWorkArea']> {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return ['x', 'y', 'width', 'height'].every((k) => typeof r[k] === 'number' && Number.isFinite(r[k] as number))
}

/** Build a valid Settings from untrusted input layered over `base`. */
export function sanitize(base: Settings, input: Partial<Record<keyof Settings, unknown>>): Settings {
  const pick = <K extends keyof Settings>(key: K, ok: (v: unknown) => boolean): Settings[K] =>
    key in input && ok(input[key]) ? (input[key] as Settings[K]) : base[key]
  const bool = (v: unknown) => typeof v === 'boolean'
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)

  const out: Settings = {
    launchAtLogin: pick('launchAtLogin', bool),
    reduceMotion: pick('reduceMotion', bool),
    smoothAnimation: pick('smoothAnimation', bool),
    suppressInFullscreen: pick('suppressInFullscreen', bool),
    // The old "dots" style became "compact".
    collapsedStyle:
      'collapsedStyle' in input && input.collapsedStyle === 'dots'
        ? 'compact'
        : pick('collapsedStyle', (v) => COLLAPSED_STYLES.includes(v as CollapsedStyle)),
    stickDisplayId: 'stickDisplayId' in input && !num(input.stickDisplayId) ? undefined : pick('stickDisplayId', num),
    stickDisplayWorkArea:
      'stickDisplayWorkArea' in input && !isRect(input.stickDisplayWorkArea)
        ? undefined
        : pick('stickDisplayWorkArea', isRect),
    stickDisplayScaleFactor:
      'stickDisplayScaleFactor' in input && !num(input.stickDisplayScaleFactor)
        ? undefined
        : pick('stickDisplayScaleFactor', num),
    disabledProviders: pick('disabledProviders', (v) => Array.isArray(v) && v.every((x) => typeof x === 'string')),
    pillHidden: pick('pillHidden', (v) => Array.isArray(v) && v.every((x) => typeof x === 'string')),
    notifications: pick('notifications', bool),
    showCostEstimates: pick('showCostEstimates', bool),
    usageRefreshMinutes: Math.min(60, Math.max(1, Math.round(pick('usageRefreshMinutes', num)))),
    lastSeenChangelogVersion: pick('lastSeenChangelogVersion', (v) => typeof v === 'string')
  }
  return out
}
