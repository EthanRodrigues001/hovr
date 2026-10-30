/**
 * Turns usage records into the report the History tab shows. Pure: takes `now`
 * and a time-zone-aware day key function so tests are deterministic.
 */
import type { HistoryDay, HistoryModel, HistoryProvider, HistoryReport, TokenTotals } from '../../../shared/history'
import { totalTokens } from '../../../shared/history'
import type { UsageRecord } from './parse'
import { costOf, lookupRate, type RateTable } from './pricing'

const DAY_MS = 86_400_000

function emptyTotals(): TokenTotals {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, requests: 0 }
}

function add(into: TokenTotals, r: UsageRecord): void {
  into.input += r.input
  into.output += r.output
  into.cacheRead += r.cacheRead
  into.cacheWrite += r.cacheWrite
  into.requests += 1
}

/** Local calendar date, YYYY-MM-DD. */
export function localDayKey(ms: number): string {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Price of one record: the tool's own figure if it reported one, else rate x tokens. */
function recordCost(r: UsageRecord, rates: RateTable | null): number | null {
  if (r.reportedCostUsd !== null) return r.reportedCostUsd
  if (!rates) return null
  const rate = lookupRate(rates, r.model)
  return rate ? costOf(rate, r) : null
}

export function buildReport(input: {
  records: Iterable<UsageRecord>
  days: number
  now: number
  rates: RateTable | null
  pricesAsOf: string | null
  providersScanned: HistoryProvider[]
}): HistoryReport {
  const { days, now, rates } = input
  // Window: the last `days` local calendar days including today.
  const first = new Date(now)
  first.setHours(0, 0, 0, 0)
  first.setDate(first.getDate() - (days - 1))
  const since = first.getTime()

  const dayMap = new Map<string, HistoryDay>()
  for (let i = 0; i < days; i++) {
    const key = localDayKey(since + i * DAY_MS + DAY_MS / 2)
    dayMap.set(key, { date: key, tokens: 0, costUsd: null, byProvider: {} })
  }

  const totals = emptyTotals()
  let totalCost: number | null = null
  const models = new Map<string, HistoryModel>()

  for (const r of input.records) {
    if (r.timestampMs < since || r.timestampMs > now + DAY_MS) continue
    const day = dayMap.get(localDayKey(r.timestampMs))
    if (!day) continue
    add(totals, r)
    const tokens = r.input + r.output + r.cacheRead + r.cacheWrite
    day.tokens += tokens
    day.byProvider[r.provider] = (day.byProvider[r.provider] ?? 0) + tokens

    const cost = recordCost(r, rates)
    if (cost !== null) {
      day.costUsd = (day.costUsd ?? 0) + cost
      totalCost = (totalCost ?? 0) + cost
    }

    const mkey = `${r.provider}\0${r.model}`
    let m = models.get(mkey)
    if (!m) {
      m = { provider: r.provider, model: r.model, totals: emptyTotals(), costUsd: null }
      models.set(mkey, m)
    }
    add(m.totals, r)
    if (cost !== null) m.costUsd = (m.costUsd ?? 0) + cost
  }

  return {
    generatedAt: new Date(now).toISOString(),
    days,
    totals: { ...totals, costUsd: totalCost },
    byDay: [...dayMap.values()],
    byModel: [...models.values()].sort((a, b) => totalTokens(b.totals) - totalTokens(a.totals)),
    pricesAsOf: input.pricesAsOf,
    providersScanned: input.providersScanned
  }
}
