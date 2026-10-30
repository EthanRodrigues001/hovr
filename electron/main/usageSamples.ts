/**
 * Usage samples: every refresh appends the used % of each limit window to a small
 * JSONL file. That gives Forecast a real "used so far" curve instead of a guess.
 * Local only; entries older than 40 days are dropped on startup.
 */
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { UsageSample, UsageState } from '../../shared/usage'
import { PATHS } from '../store/paths'

const KEEP_MS = 40 * 86_400_000
/** Skip a sample if the same window was sampled this recently with no change. */
const MIN_GAP_MS = 4 * 60_000

interface Line extends UsageSample {
  k: string
}

const file = () => join(PATHS.root(), 'usage-samples.jsonl')
const last = new Map<string, { t: number; used: number }>()
let loaded: Promise<void> | null = null

function parse(raw: string): Line[] {
  const out: Line[] = []
  for (const line of raw.split('\n')) {
    if (!line) continue
    try {
      const v = JSON.parse(line) as Line
      if (typeof v.k === 'string' && typeof v.t === 'number' && typeof v.used === 'number') out.push(v)
    } catch {
      /* torn line: skip */
    }
  }
  return out
}

function ensureLoaded(): Promise<void> {
  loaded ??= (async () => {
    try {
      const lines = parse(await readFile(file(), 'utf8'))
      const fresh = lines.filter((l) => l.t >= Date.now() - KEEP_MS)
      for (const l of fresh) last.set(l.k, { t: l.t, used: l.used })
      if (fresh.length !== lines.length) await writeFile(file(), fresh.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf8')
    } catch {
      /* no file yet */
    }
  })()
  return loaded
}

export async function recordSamples(state: UsageState, now = Date.now()): Promise<void> {
  await ensureLoaded()
  const rows: Line[] = []
  for (const [provider, limits] of Object.entries(state.usage)) {
    for (const w of limits?.windows ?? []) {
      const k = `${provider}:${w.id}`
      const prev = last.get(k)
      if (prev && now - prev.t < MIN_GAP_MS && Math.abs(prev.used - w.usedPercent) < 0.05) continue
      last.set(k, { t: now, used: w.usedPercent })
      rows.push({ k, t: now, used: Math.round(w.usedPercent * 100) / 100 })
    }
  }
  if (rows.length === 0) return
  try {
    await mkdir(dirname(file()), { recursive: true })
    await appendFile(file(), rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')
  } catch {
    /* history is a nicety; never break the refresh */
  }
}

export async function readSamples(provider: string, windowId: string, since: number): Promise<UsageSample[]> {
  try {
    const key = `${provider}:${windowId}`
    return parse(await readFile(file(), 'utf8'))
      .filter((l) => l.k === key && l.t >= since)
      .map(({ t, used }) => ({ t, used }))
      .sort((a, b) => a.t - b.t)
  } catch {
    return []
  }
}
