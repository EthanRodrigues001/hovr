/**
 * Transcript parsers: one function per tool, turning a JSONL line into a usage record.
 * Pure (no I/O). Ports the dedupe rules T3 Code learned the hard way:
 *
 * - Claude writes one line per assistant content block, each repeating the same
 *   `usage` for the parent message. Summing them overcounts about 2.4x, so records
 *   carry a `dedupeKey` (`message.id:requestId`) and the scanner keeps the first.
 * - Codex `token_count` events repeat, and forked sessions replay their parent's
 *   history in a burst. Usage is taken as the delta of the cumulative counter, and
 *   fork replays only move the baseline.
 */
import type { HistoryProvider } from '../../../shared/history'

export interface UsageRecord {
  provider: HistoryProvider
  timestampMs: number
  model: string
  /** Fresh input (not served from cache). */
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  /** Claude only; null = no dedupe possible. */
  dedupeKey: string | null
  /** Cost the tool itself reported, when it did. */
  reportedCostUsd: number | null
}

function tokens(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function timestampMs(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const ms = Date.parse(v)
  return Number.isFinite(ms) ? ms : null
}

/** Claude Code uses this model for local placeholders that never reached the API. */
const CLAUDE_SYNTHETIC = '<synthetic>'

export function parseClaudeLine(line: string): UsageRecord | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    return null
  }
  if (!isRecord(parsed) || parsed.type !== 'assistant' || !isRecord(parsed.message)) return null
  const message = parsed.message
  const usage = message.usage
  if (!isRecord(usage)) return null
  const ts = timestampMs(parsed.timestamp)
  const model = typeof message.model === 'string' ? message.model : ''
  if (ts === null || !model || model === CLAUDE_SYNTHETIC) return null

  const messageId = typeof message.id === 'string' ? message.id : null
  const requestId = typeof parsed.requestId === 'string' ? parsed.requestId : null
  const cost = parsed.costUSD
  return {
    provider: 'claude',
    timestampMs: ts,
    model,
    input: tokens(usage.input_tokens),
    output: tokens(usage.output_tokens),
    cacheRead: tokens(usage.cache_read_input_tokens),
    cacheWrite: tokens(usage.cache_creation_input_tokens),
    dedupeKey: messageId === null && requestId === null ? null : `${messageId ?? ''}:${requestId ?? ''}`,
    reportedCostUsd: typeof cost === 'number' && Number.isFinite(cost) ? cost : null
  }
}

/* ------------------------------------------------------------------ */
/* Codex                                                               */
/* ------------------------------------------------------------------ */

interface Cumulative {
  input: number
  cached: number
  cacheWrite: number
  output: number
}

export interface CodexScanState {
  model: string
  sawSessionMeta: boolean
  /** Forked sessions replay parent history right after their meta line. */
  suppressingForkCopies: boolean
  forkAnchorMs: number
  last: Cumulative | null
}

export function initialCodexState(): CodexScanState {
  return { model: '', sawSessionMeta: false, suppressingForkCopies: false, forkAnchorMs: 0, last: null }
}

/** Forks copy parent history in a burst (0-40 ms gaps); genuine child usage follows a model turn (seconds). */
const FORK_COPY_MAX_GAP_MS = 1000

function readCumulative(v: unknown): Cumulative | null {
  if (!isRecord(v)) return null
  if (typeof v.input_tokens !== 'number' || typeof v.output_tokens !== 'number') return null
  return {
    input: tokens(v.input_tokens),
    cached: tokens(v.cached_input_tokens),
    cacheWrite: tokens(v.cache_write_input_tokens),
    output: tokens(v.output_tokens)
  }
}

function isForkedMeta(payload: Record<string, unknown>): boolean {
  if (typeof payload.forked_from_id === 'string') return true
  const source = payload.source
  if (!isRecord(source) || !isRecord(source.subagent) || !isRecord(source.subagent.thread_spawn)) return false
  return typeof source.subagent.thread_spawn.parent_thread_id === 'string'
}

export function parseCodexLine(line: string, state: CodexScanState): UsageRecord | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    return null
  }
  if (!isRecord(parsed) || !isRecord(parsed.payload)) return null
  const payload = parsed.payload

  if (parsed.type === 'session_meta') {
    // Only the first meta identifies the session; copied ancestor metas must be ignored.
    if (state.sawSessionMeta) return null
    state.sawSessionMeta = true
    const ts = timestampMs(parsed.timestamp)
    if (ts !== null && isForkedMeta(payload)) {
      state.suppressingForkCopies = true
      state.forkAnchorMs = ts
    }
    return null
  }
  if (parsed.type === 'turn_context') {
    if (typeof payload.model === 'string') state.model = payload.model
    return null
  }
  if (payload.type !== 'token_count' || !isRecord(payload.info)) return null

  const ts = timestampMs(parsed.timestamp)
  if (ts === null || !state.model) return null
  const total = readCumulative(payload.info.total_token_usage)
  const last = readCumulative(payload.info.last_token_usage)

  if (state.suppressingForkCopies) {
    if (ts - state.forkAnchorMs < FORK_COPY_MAX_GAP_MS) {
      // Replayed parent history: already billed there, but it sets the child's baseline.
      state.forkAnchorMs = ts
      if (total) state.last = total
      return null
    }
    state.suppressingForkCopies = false
  }

  // Prefer the cumulative counter: a re-emitted event has delta 0 and is dropped.
  let delta: Cumulative | null = null
  if (total) {
    const prev = state.last
    const monotonic =
      prev === null ||
      (total.input >= prev.input && total.cached >= prev.cached && total.cacheWrite >= prev.cacheWrite && total.output >= prev.output)
    delta = monotonic
      ? {
          input: total.input - (prev?.input ?? 0),
          cached: total.cached - (prev?.cached ?? 0),
          cacheWrite: total.cacheWrite - (prev?.cacheWrite ?? 0),
          output: total.output - (prev?.output ?? 0)
        }
      : last // counter reset: fall back to the per-request figure
    state.last = total
  } else if (last) {
    delta = last
  }
  if (!delta || (delta.input === 0 && delta.output === 0 && delta.cached === 0 && delta.cacheWrite === 0)) return null

  // Codex `input_tokens` includes cached and cache-write tokens.
  const fresh = Math.max(0, delta.input - delta.cached - delta.cacheWrite)
  return {
    provider: 'codex',
    timestampMs: ts,
    model: state.model,
    input: fresh,
    output: delta.output,
    cacheRead: delta.cached,
    cacheWrite: delta.cacheWrite,
    dedupeKey: null,
    reportedCostUsd: null
  }
}
