import { describe, expect, it } from 'vitest'
import { buildReport, localDayKey } from '../electron/main/history/aggregate'
import { initialCodexState, parseClaudeLine, parseCodexLine, type UsageRecord } from '../electron/main/history/parse'
import { costOf, lookupRate, parseRateTable } from '../electron/main/history/pricing'

const claudeLine = (o: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: 'assistant',
    timestamp: '2026-10-30T10:00:00Z',
    requestId: 'req_1',
    message: {
      id: 'msg_1',
      model: 'claude-sonnet-4-5',
      usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 300, cache_creation_input_tokens: 40 }
    },
    ...o
  })

describe('parseClaudeLine', () => {
  it('maps usage fields and builds a dedupe key', () => {
    expect(parseClaudeLine(claudeLine())).toMatchObject({
      provider: 'claude',
      model: 'claude-sonnet-4-5',
      input: 10,
      output: 20,
      cacheRead: 300,
      cacheWrite: 40,
      dedupeKey: 'msg_1:req_1',
      reportedCostUsd: null
    })
  })

  it('skips non-assistant lines, synthetic models, bad timestamps and junk', () => {
    expect(parseClaudeLine(claudeLine({ type: 'user' }))).toBeNull()
    expect(parseClaudeLine(claudeLine({ message: { id: 'm', model: '<synthetic>', usage: { input_tokens: 1 } } }))).toBeNull()
    expect(parseClaudeLine(claudeLine({ timestamp: 'nope' }))).toBeNull()
    expect(parseClaudeLine('not json')).toBeNull()
    expect(parseClaudeLine('null')).toBeNull()
  })

  it('treats negative / non-numeric token fields as zero and keeps reported cost', () => {
    const r = parseClaudeLine(
      claudeLine({ costUSD: 0.5, message: { id: 'm', model: 'x', usage: { input_tokens: -5, output_tokens: 'a' } } })
    )
    expect(r).toMatchObject({ input: 0, output: 0, reportedCostUsd: 0.5 })
  })
})

const codexLine = (type: string, payload: Record<string, unknown>, ts = '2026-10-30T10:00:00.000Z') =>
  JSON.stringify({ timestamp: ts, type, payload })
const tc = (total: Record<string, number>, ts?: string, last?: Record<string, number>) =>
  codexLine('event_msg', { type: 'token_count', info: { total_token_usage: total, ...(last ? { last_token_usage: last } : {}) } }, ts)

describe('parseCodexLine', () => {
  it('turns cumulative counters into per-request deltas and drops re-emits', () => {
    const s = initialCodexState()
    expect(parseCodexLine(codexLine('session_meta', { id: 's1' }), s)).toBeNull()
    expect(parseCodexLine(codexLine('turn_context', { model: 'gpt-5' }), s)).toBeNull()
    const a = parseCodexLine(tc({ input_tokens: 1000, cached_input_tokens: 400, output_tokens: 100 }), s)
    expect(a).toMatchObject({ provider: 'codex', model: 'gpt-5', input: 600, cacheRead: 400, output: 100 })
    // identical re-emit => nothing new
    expect(parseCodexLine(tc({ input_tokens: 1000, cached_input_tokens: 400, output_tokens: 100 }), s)).toBeNull()
    const b = parseCodexLine(tc({ input_tokens: 1500, cached_input_tokens: 700, output_tokens: 180 }), s)
    expect(b).toMatchObject({ input: 200, cacheRead: 300, output: 80 })
  })

  it('ignores token_count before any model is known', () => {
    expect(parseCodexLine(tc({ input_tokens: 5, output_tokens: 1 }), initialCodexState())).toBeNull()
  })

  it('falls back to last_token_usage on a counter reset', () => {
    const s = initialCodexState()
    parseCodexLine(codexLine('turn_context', { model: 'gpt-5' }), s)
    parseCodexLine(tc({ input_tokens: 1000, output_tokens: 100 }), s)
    const r = parseCodexLine(tc({ input_tokens: 50, output_tokens: 5 }, undefined, { input_tokens: 50, output_tokens: 5 }), s)
    expect(r).toMatchObject({ input: 50, output: 5 })
  })

  it('forked sessions: replayed parent history only sets the baseline', () => {
    const s = initialCodexState()
    parseCodexLine(codexLine('session_meta', { id: 'child', forked_from_id: 'parent' }, '2026-10-30T10:00:00.000Z'), s)
    parseCodexLine(codexLine('turn_context', { model: 'gpt-5' }, '2026-10-30T10:00:00.010Z'), s)
    // replay burst (gaps of 20ms)
    expect(parseCodexLine(tc({ input_tokens: 9000, output_tokens: 900 }, '2026-10-30T10:00:00.020Z'), s)).toBeNull()
    expect(parseCodexLine(tc({ input_tokens: 9500, output_tokens: 950 }, '2026-10-30T10:00:00.040Z'), s)).toBeNull()
    // genuine child usage, seconds later: only the delta counts
    const r = parseCodexLine(tc({ input_tokens: 9800, output_tokens: 990 }, '2026-10-30T10:00:08.000Z'), s)
    expect(r).toMatchObject({ input: 300, output: 40 })
  })

  it('only the first session_meta counts as the session identity', () => {
    const s = initialCodexState()
    parseCodexLine(codexLine('session_meta', { id: 'a' }), s)
    parseCodexLine(codexLine('session_meta', { id: 'b', forked_from_id: 'a' }), s)
    expect(s.suppressingForkCopies).toBe(false)
  })
})

describe('pricing', () => {
  const table = parseRateTable({
    'claude-sonnet-4-5': { input_cost_per_token: 3e-6, output_cost_per_token: 15e-6, cache_read_input_token_cost: 3e-7, cache_creation_input_token_cost: 3.75e-6 },
    'anthropic/claude-haiku-4-5': { input_cost_per_token: 1e-6, output_cost_per_token: 5e-6 },
    'gpt-5': { input_cost_per_token: 1.25e-6, output_cost_per_token: 10e-6 },
    'no-output': { input_cost_per_token: 1e-6 },
    'dup/model-a': { input_cost_per_token: 1e-6, output_cost_per_token: 1e-6 },
    'other/model-a': { input_cost_per_token: 2e-6, output_cost_per_token: 2e-6 }
  })

  it('looks up by exact, bracketed-variant and provider-prefixed names', () => {
    expect(lookupRate(table, 'claude-sonnet-4-5')?.input).toBe(3e-6)
    expect(lookupRate(table, 'Claude-Sonnet-4-5[1m]')?.output).toBe(15e-6)
    expect(lookupRate(table, 'claude-haiku-4-5')?.input).toBe(1e-6) // alias of anthropic/...
  })

  it('refuses ambiguous / unpriceable names and drops models missing a rate', () => {
    expect(lookupRate(table, 'sonnet')).toBeNull()
    expect(lookupRate(table, '<synthetic>')).toBeNull()
    expect(lookupRate(table, 'no-output')).toBeNull()
    expect(lookupRate(table, 'model-a')).toBeNull() // two providers disagree
    expect(lookupRate(table, 'unknown-model')).toBeNull()
  })

  it('cache rates fall back to the input rate; costOf sums the four buckets', () => {
    const haiku = lookupRate(table, 'claude-haiku-4-5')!
    expect(haiku.cacheRead).toBe(1e-6)
    const sonnet = lookupRate(table, 'claude-sonnet-4-5')!
    expect(costOf(sonnet, { input: 1000, output: 100, cacheRead: 10_000, cacheWrite: 200 })).toBeCloseTo(
      1000 * 3e-6 + 100 * 15e-6 + 10_000 * 3e-7 + 200 * 3.75e-6
    )
  })
})

describe('buildReport', () => {
  const now = new Date(2026, 9, 30, 15, 0, 0).getTime() // local time, Oct 30
  const at = (daysAgo: number, hour = 9) => new Date(2026, 9, 30 - daysAgo, hour, 0, 0).getTime()
  const rec = (o: Partial<UsageRecord>): UsageRecord => ({
    provider: 'claude',
    timestampMs: at(0),
    model: 'claude-sonnet-4-5',
    input: 1000,
    output: 100,
    cacheRead: 0,
    cacheWrite: 0,
    dedupeKey: null,
    reportedCostUsd: null,
    ...o
  })
  const rates = parseRateTable({
    'claude-sonnet-4-5': { input_cost_per_token: 1e-6, output_cost_per_token: 1e-5 }
  })

  it('buckets by local day, includes empty days, and excludes records outside the window', () => {
    const r = buildReport({
      records: [rec({}), rec({ timestampMs: at(1) }), rec({ timestampMs: at(2) }), rec({ timestampMs: at(10) })],
      days: 3,
      now,
      rates: null,
      pricesAsOf: null,
      providersScanned: ['claude']
    })
    expect(r.byDay.map((d) => d.date)).toEqual([localDayKey(at(2)), localDayKey(at(1)), localDayKey(at(0))])
    expect(r.byDay.map((d) => d.tokens)).toEqual([1100, 1100, 1100])
    expect(r.totals.requests).toBe(3)
    expect(r.totals.costUsd).toBeNull()
  })

  it('prices records, prefers a reported cost, and leaves unknown models unpriced', () => {
    const r = buildReport({
      records: [
        rec({}), // 1000*1e-6 + 100*1e-5 = 0.002
        rec({ reportedCostUsd: 0.5 }),
        rec({ model: 'mystery-model' })
      ],
      days: 1,
      now,
      rates,
      pricesAsOf: 'x',
      providersScanned: ['claude']
    })
    expect(r.totals.costUsd).toBeCloseTo(0.502)
    const mystery = r.byModel.find((m) => m.model === 'mystery-model')!
    expect(mystery.costUsd).toBeNull()
    expect(r.byDay[0].byProvider.claude).toBe(3300)
  })

  it('sorts models by tokens and splits providers', () => {
    const r = buildReport({
      records: [rec({ input: 10 }), rec({ provider: 'codex', model: 'gpt-5', input: 5000 })],
      days: 1,
      now,
      rates: null,
      pricesAsOf: null,
      providersScanned: ['claude', 'codex']
    })
    expect(r.byModel.map((m) => m.model)).toEqual(['gpt-5', 'claude-sonnet-4-5'])
    expect(r.byDay[0].byProvider).toEqual({ claude: 110, codex: 5100 })
  })
})
