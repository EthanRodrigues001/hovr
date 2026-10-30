/**
 * Scans the local session logs of Claude Code, Codex and Antigravity and builds the History
 * report. Read-only: nothing is written except the small price-table cache.
 *
 * Per-file results are cached by (mtime, size), so after the first scan only
 * files that changed are re-read. Only files touched inside the window are opened.
 */
import { createReadStream } from 'node:fs'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import type { HistoryProvider, HistoryReport } from '../../../shared/history'
import { PATHS } from '../../store/paths'
import { loadSettings } from '../../store/settings'
import { buildReport } from './aggregate'
import { readAntigravityDb } from './antigravityDb'
import { initialCodexState, parseClaudeLine, parseCodexLine, type UsageRecord } from './parse'
import { parseRateTable, type RateTable } from './pricing'

const PRICE_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'
const PRICE_TTL_MS = 24 * 3_600_000
const DAY_MS = 86_400_000
export const MAX_HISTORY_DAYS = 90

/* ------------------------------ file discovery ------------------------------ */

function claudeRoots(env: NodeJS.ProcessEnv): string[] {
  return [join(env.CLAUDE_CONFIG_DIR?.trim() || join(homedir(), '.claude'), 'projects')]
}

function codexRoots(env: NodeJS.ProcessEnv): string[] {
  const home = env.CODEX_HOME?.trim() || join(homedir(), '.codex')
  return [join(home, 'sessions'), join(home, 'archived_sessions')]
}

/** Antigravity keeps one SQLite file per conversation, here and in T3 Code's copy of its ACP data. */
function antigravityRoots(): string[] {
  const home = homedir()
  return [join(home, '.gemini', 'antigravity', 'conversations'), join(home, '.gemini', 'antigravity-acp', 'conversations')]
}

async function antigravityDirs(): Promise<string[]> {
  const dirs = antigravityRoots()
  const t3 = join(homedir(), '.t3', 'userdata', 'providers', 'antigravity')
  try {
    for (const e of await readdir(t3)) dirs.push(join(t3, e, 'antigravity-acp', 'conversations'))
  } catch {
    /* T3 Code not installed */
  }
  return dirs
}

/** Every `.db` directly inside `dir` modified at or after `minMtime`. */
async function listDbs(dir: string, minMtime: number): Promise<{ path: string; mtimeMs: number; size: number }[]> {
  const out: { path: string; mtimeMs: number; size: number }[] = []
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return out
  }
  for (const name of names) {
    if (!name.endsWith('.db')) continue
    const path = join(dir, name)
    try {
      const s = await stat(path)
      if (s.isFile() && s.mtimeMs >= minMtime) out.push({ path, mtimeMs: s.mtimeMs, size: s.size })
    } catch {
      /* vanished */
    }
  }
  return out
}

/** Every `.jsonl` under `dir` modified at or after `minMtime`. */
async function listJsonl(dir: string, minMtime: number): Promise<{ path: string; mtimeMs: number; size: number }[]> {
  const out: { path: string; mtimeMs: number; size: number }[] = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await listJsonl(path, minMtime)))
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      try {
        const s = await stat(path)
        if (s.mtimeMs >= minMtime) out.push({ path, mtimeMs: s.mtimeMs, size: s.size })
      } catch {
        /* vanished between readdir and stat */
      }
    }
  }
  return out
}

/* ------------------------------ file scanning ------------------------------ */

interface CachedFile {
  mtimeMs: number
  size: number
  records: UsageRecord[]
}
const fileCache = new Map<string, CachedFile>()

/* The per-file results are also kept on disk, so a fresh launch does not re-parse every log. */
const CACHE_VERSION = 1
const cacheFile = () => join(PATHS.root(), 'history-cache.json')
let diskLoaded = false
let saveTimer: NodeJS.Timeout | undefined

async function loadDiskCache(): Promise<void> {
  if (diskLoaded) return
  diskLoaded = true
  try {
    const parsed = JSON.parse(await readFile(cacheFile(), 'utf8')) as { v?: number; files?: Record<string, CachedFile> }
    if (parsed.v !== CACHE_VERSION || typeof parsed.files !== 'object' || parsed.files === null) return
    for (const [path, entry] of Object.entries(parsed.files)) {
      if (entry && Array.isArray(entry.records) && typeof entry.mtimeMs === 'number' && typeof entry.size === 'number') {
        fileCache.set(path, entry)
      }
    }
  } catch {
    /* no cache yet, or unreadable: start fresh */
  }
}

function saveDiskCacheSoon(): void {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const files: Record<string, CachedFile> = {}
    for (const [path, entry] of fileCache) files[path] = entry
    void mkdir(dirname(cacheFile()), { recursive: true })
      .then(() => writeFile(cacheFile(), JSON.stringify({ v: CACHE_VERSION, files }), 'utf8'))
      .catch(() => undefined)
  }, 3000)
}

async function scanFile(path: string, provider: HistoryProvider, mtimeMs: number): Promise<UsageRecord[]> {
  if (provider === 'antigravity') return readAntigravityDb(path, basename(path, '.db'), mtimeMs)
  const records: UsageRecord[] = []
  const codex = initialCodexState()
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity })
  for await (const line of rl) {
    if (provider === 'claude') {
      // Cheap pre-filter: skip the vast majority of lines without JSON.parse.
      if (!line.includes('"usage"')) continue
      const r = parseClaudeLine(line)
      if (r) records.push(r)
    } else {
      if (!line.includes('token_count') && !line.includes('turn_context') && !line.includes('session_meta')) continue
      const r = parseCodexLine(line, codex)
      if (r) records.push(r)
    }
  }
  return records
}

async function recordsFor(
  files: { path: string; mtimeMs: number; size: number }[],
  provider: HistoryProvider
): Promise<UsageRecord[]> {
  const all: UsageRecord[] = []
  let changed = false
  for (const f of files) {
    let cached = fileCache.get(f.path)
    if (!cached || cached.mtimeMs !== f.mtimeMs || cached.size !== f.size) {
      try {
        cached = { mtimeMs: f.mtimeMs, size: f.size, records: await scanFile(f.path, provider, f.mtimeMs) }
      } catch {
        continue // unreadable / locked: skip, never fail the whole report
      }
      fileCache.set(f.path, cached)
      changed = true
    }
    all.push(...cached.records)
  }
  if (changed) saveDiskCacheSoon()
  return all
}

/** Claude repeats a message's usage on every content block: keep the first per key. */
function dedupe(records: UsageRecord[]): UsageRecord[] {
  const seen = new Set<string>()
  const out: UsageRecord[] = []
  for (const r of records.sort((a, b) => a.timestampMs - b.timestampMs)) {
    if (r.dedupeKey !== null) {
      const key = `${r.provider}\0${r.dedupeKey}`
      if (seen.has(key)) continue
      seen.add(key)
    }
    out.push(r)
  }
  return out
}

/* --------------------------------- prices --------------------------------- */

interface PriceCache {
  fetchedAt: string
  /** Trimmed LiteLLM document: just the four rate fields per model. */
  doc: Record<string, Record<string, number>>
}

const priceFile = () => join(PATHS.root(), 'prices.json')
let priceMemo: { table: RateTable; fetchedAt: string } | null = null

function trim(doc: unknown): PriceCache['doc'] {
  const out: PriceCache['doc'] = {}
  if (typeof doc !== 'object' || doc === null) return out
  for (const [name, raw] of Object.entries(doc as Record<string, unknown>)) {
    if (typeof raw !== 'object' || raw === null) continue
    const e = raw as Record<string, unknown>
    if (typeof e.input_cost_per_token !== 'number' || typeof e.output_cost_per_token !== 'number') continue
    const row: Record<string, number> = {
      input_cost_per_token: e.input_cost_per_token,
      output_cost_per_token: e.output_cost_per_token
    }
    for (const k of ['cache_read_input_token_cost', 'cache_creation_input_token_cost']) {
      if (typeof e[k] === 'number') row[k] = e[k] as number
    }
    out[name] = row
  }
  return out
}

async function loadPrices(): Promise<{ table: RateTable; fetchedAt: string } | null> {
  let cached: PriceCache | null = null
  try {
    const parsed: unknown = JSON.parse(await readFile(priceFile(), 'utf8'))
    if (typeof parsed === 'object' && parsed !== null && typeof (parsed as PriceCache).fetchedAt === 'string') {
      cached = parsed as PriceCache
    }
  } catch {
    /* no cache yet */
  }
  const fresh = cached && Date.now() - Date.parse(cached.fetchedAt) < PRICE_TTL_MS
  if (!fresh) {
    try {
      const res = await fetch(PRICE_URL, { signal: AbortSignal.timeout(15_000), redirect: 'follow' })
      if (res.ok) {
        const doc = trim(await res.json())
        if (Object.keys(doc).length > 0) {
          cached = { fetchedAt: new Date().toISOString(), doc }
          await mkdir(dirname(priceFile()), { recursive: true })
          await writeFile(priceFile(), JSON.stringify(cached), 'utf8')
        }
      }
    } catch {
      /* offline: fall back to a stale cache below */
    }
  }
  if (!cached) return null
  if (priceMemo?.fetchedAt === cached.fetchedAt) return priceMemo
  priceMemo = { table: parseRateTable(cached.doc), fetchedAt: cached.fetchedAt }
  return priceMemo
}

/* --------------------------------- public --------------------------------- */

const inFlight = new Map<number, Promise<HistoryReport>>()

export function getHistory(daysRequested: number, env: NodeJS.ProcessEnv = process.env): Promise<HistoryReport> {
  const days = Math.min(MAX_HISTORY_DAYS, Math.max(1, Math.round(daysRequested) || 30))
  const existing = inFlight.get(days)
  if (existing) return existing
  const run = (async () => {
    await loadDiskCache()
    const now = Date.now()
    // A file last modified before the window started cannot hold records inside it.
    const minMtime = now - (days + 1) * DAY_MS
    const scanned: HistoryProvider[] = []
    const records: UsageRecord[] = []

    for (const [provider, roots] of [
      ['claude', claudeRoots(env)],
      ['codex', codexRoots(env)]
    ] as const) {
      const files = (await Promise.all(roots.map((r) => listJsonl(r, minMtime)))).flat()
      if (files.length === 0) continue
      scanned.push(provider)
      records.push(...(await recordsFor(files, provider)))
    }

    const agyFiles = (await Promise.all((await antigravityDirs()).map((d) => listDbs(d, minMtime)))).flat()
    if (agyFiles.length > 0) {
      const agy = await recordsFor(agyFiles, 'antigravity')
      if (agy.length > 0) {
        scanned.push('antigravity')
        records.push(...agy)
      }
    }

    const prices = loadSettings().showCostEstimates ? await loadPrices() : null
    return buildReport({
      records: dedupe(records),
      days,
      now,
      rates: prices?.table ?? null,
      pricesAsOf: prices?.fetchedAt ?? null,
      providersScanned: scanned
    })
  })().finally(() => inFlight.delete(days))
  inFlight.set(days, run)
  return run
}

/** Scan in the background shortly after launch so the first Analytics open is instant. */
export function prewarmHistory(): void {
  setTimeout(() => void getHistory(MAX_HISTORY_DAYS).catch(() => undefined), 4000)
}
