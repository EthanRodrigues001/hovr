/**
 * Desktop alerts for limits. Each kind of alert fires at most once per limit window:
 *  - "low": 10% left or less
 *  - "may run out": at the current pace the window empties before it resets
 *
 * A window is identified by provider + id, NOT by its reset time, because providers
 * report that time with a few seconds of jitter between reads. A new window is only
 * recognised when the reset time jumps forward by about a window length, or usage
 * falls sharply. Nothing fires for a state that was already true when hovr started.
 */
import { Notification } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { forecastOf } from '../../shared/forecast'
import { isNewWindow } from '../../shared/alertLogic'
import type { UsageState } from '../../shared/usage'
import { remainingPercent } from '../../shared/usageMath'
import { PATHS } from '../store/paths'
import { loadSettings } from '../store/settings'

const LOW_AT = 10
/** Needs this much of the window elapsed before a pace-based warning is trusted. */
const MIN_ELAPSED = 0.1

interface Cycle {
  resetsAt: number
  used: number
  lowSent: boolean
  runOutSent: boolean
}
const cycles = new Map<string, Cycle>()
let baselined = false
let loaded = false

/* What was already announced is kept on disk, so restarting hovr neither repeats an alert nor swallows a new one. */
const stateFile = () => join(PATHS.root(), 'alerts-state.json')

function loadState(): void {
  if (loaded) return
  loaded = true
  try {
    const parsed = JSON.parse(readFileSync(stateFile(), 'utf8')) as Record<string, Cycle>
    for (const [key, c] of Object.entries(parsed)) {
      if (c && typeof c.resetsAt === 'number' && typeof c.used === 'number') cycles.set(key, c)
    }
    baselined = true // not the first run: new conditions are news
  } catch {
    /* first run: the first pass only records the state */
  }
}

function saveState(): void {
  try {
    mkdirSync(dirname(stateFile()), { recursive: true })
    writeFileSync(stateFile(), JSON.stringify(Object.fromEntries(cycles)), 'utf8')
  } catch {
    /* best effort */
  }
}

/** For the "Send a test alert" button: true when the system can show notifications. */
export function sendTestAlert(): boolean {
  const ok = Notification.isSupported()
  if (ok) notify('HOVR', 'Alerts are working. You will be told when a limit is nearly used up.')
  return ok
}

function notify(title: string, body: string): void {
  try {
    if (Notification.isSupported()) new Notification({ title, body }).show()
  } catch {
    /* notifications are best effort */
  }
}

export function checkAlerts(state: UsageState, now = Date.now()): void {
  loadState()
  const enabled = loadSettings().notifications
  const names = new Map(state.providers.map((p) => [p.id, p.label]))
  for (const [provider, limits] of Object.entries(state.usage)) {
    for (const w of limits?.windows ?? []) {
      const key = `${provider}:${w.id}`
      const resetsAt = w.resetsAt ? Date.parse(w.resetsAt) : 0
      const remaining = remainingPercent(w)
      const f = forecastOf(w, now)
      const low = remaining <= LOW_AT
      const runsOut = f !== null && f.runOutAt !== null && f.elapsed >= MIN_ELAPSED && f.runOutAt > now

      let cycle = cycles.get(key)
      if (!cycle || isNewWindow(cycle, w)) {
        // First sight (or a fresh window): whatever is already true counts as announced
        // during the baseline pass, and as new news afterwards.
        cycle = { resetsAt, used: w.usedPercent, lowSent: !baselined && low, runOutSent: !baselined && runsOut }
        cycles.set(key, cycle)
      }
      cycle.resetsAt = Math.max(cycle.resetsAt, resetsAt)
      cycle.used = w.usedPercent

      if (!enabled) continue
      const label = `${names.get(provider as never) ?? provider} · ${w.label}`
      if (low && !cycle.lowSent) {
        cycle.lowSent = true
        notify(`${label}: ${remaining}% left`, 'This limit is almost used up.')
      } else if (runsOut && !cycle.runOutSent && f?.runOutAt) {
        cycle.runOutSent = true
        const when = new Date(f.runOutAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
        notify(`${label} may run out`, `At this pace it runs out around ${when}, before it resets.`)
      }
    }
  }
  baselined = true
  saveState()
}
