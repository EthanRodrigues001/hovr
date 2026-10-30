/**
 * Turns usage records into the report the History tab shows. Pure: takes `now`
 * and a time-zone-aware day key function so tests are deterministic.
 */
import type {
  HistoryCostByType,
  HistoryDay,
  HistoryModel,
  HistoryProvider,
  HistoryProviderTotals,
  HistoryReport,
  TokenTotals
} from '../../../shared/history'
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
    dayMap.set(key, { date: key, tokens: 0, costUsd: null, byProvider: {}, costByProvider: {} })
  }

  const totals = emptyTotals()
  let totalCost: number | null = null
  const models = new Map<string, HistoryModel>()
  const providers = new Map<HistoryProvider, HistoryProviderTotals>()
  const heatmap = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  let costByType: HistoryCostByType | null = null
  let cacheSavings: number | null = null

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
      day.costByProvider[r.provider] = (day.costByProvider[r.provider] ?? 0) + cost
      totalCost = (totalCost ?? 0) + cost
    }

    const when = new Date(r.timestampMs)
    heatmap[when.getDay()][when.getHours()] += tokens

    let p = providers.get(r.provider)
    if (!p) {
      p = { provider: r.provider, requests: 0, tokens: 0, costUsd: null }
      providers.set(r.provider, p)
    }
    p.requests += 1
    p.tokens += tokens
    if (cost !== null) p.costUsd = (p.costUsd ?? 0) + cost

    // Per-kind split only when this record was priced from the rate table.
    const rate = r.reportedCostUsd === null && rates ? lookupRate(rates, r.model) : null
    if (rate) {
      costByType ??= { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }
      costByType.input += r.input * rate.input
      costByType.cacheRead += r.cacheRead * rate.cacheRead
      costByType.cacheWrite += r.cacheWrite * rate.cacheWrite
      costByType.output += r.output * rate.output
      cacheSavings = (cacheSavings ?? 0) + r.cacheRead * (rate.input - rate.cacheRead)
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
    byProvider: [...providers.values()].sort((a, b) => b.tokens - a.tokens),
    costByType,
    cacheSavingsUsd: cacheSavings,
    heatmap,
    pricesAsOf: input.pricesAsOf,
    providersScanned: input.providersScanned
  }
}
