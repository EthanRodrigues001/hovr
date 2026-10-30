/**
 * Desktop alerts for limits. Transition based: a notification fires when a window
 * crosses into "low" (10% left or less) or newly looks like it will run out before
 * it resets, never for a state that was already true when hovr started.
 */
import { Notification } from 'electron'
import { forecastOf } from '../../shared/forecast'
import type { UsageState } from '../../shared/usage'
import { remainingPercent } from '../../shared/usageMath'
import { loadSettings } from '../store/settings'

const LOW_AT = 10
/** Needs this much of the window elapsed before a pace-based warning is trusted. */
const MIN_ELAPSED = 0.1

interface Seen {
  low: boolean
  runsOut: boolean
}
const seen = new Map<string, Seen>()
let baselined = false

function notify(title: string, body: string): void {
  try {
    if (Notification.isSupported()) new Notification({ title, body, silent: false }).show()
  } catch {
    /* notifications are best effort */
  }
}

export function checkAlerts(state: UsageState, now = Date.now()): void {
  const enabled = loadSettings().notifications
  const names = new Map(state.providers.map((p) => [p.id, p.label]))
  for (const [provider, limits] of Object.entries(state.usage)) {
    for (const w of limits?.windows ?? []) {
      // A new window (different reset time) starts fresh.
      const key = `${provider}:${w.id}:${w.resetsAt ?? ''}`
      const remaining = remainingPercent(w)
      const f = forecastOf(w, now)
      const cur: Seen = {
        low: remaining <= LOW_AT,
        runsOut: f !== null && f.runOutAt !== null && f.elapsed >= MIN_ELAPSED && f.runOutAt > now
      }
      const prev = seen.get(key)
      seen.set(key, cur)
      if (!enabled || !baselined) continue
      const label = `${names.get(provider as never) ?? provider} · ${w.label}`
      if (cur.low && !(prev?.low ?? false)) {
        notify(`${label}: ${remaining}% left`, 'This limit is almost used up.')
      } else if (cur.runsOut && !(prev?.runsOut ?? false) && f?.runOutAt) {
        const when = new Date(f.runOutAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
        notify(`${label} may run out`, `At this pace it runs out around ${when}, before it resets.`)
      }
    }
  }
  baselined = true
}
