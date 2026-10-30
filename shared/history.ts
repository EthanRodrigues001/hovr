/**
 * Token / cost history types shared by main and renderer.
 *
 * "Input" is fresh (uncached) input; cache reads and writes are tracked apart so
 * the totals are not inflated by cached context being re-read on every request.
 */
export type HistoryProvider = 'claude' | 'codex' | 'antigravity'

export interface TokenTotals {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  requests: number
}

export interface HistoryDay {
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  tokens: number
  costUsd: number | null
  byProvider: Partial<Record<HistoryProvider, number>>
  costByProvider: Partial<Record<HistoryProvider, number>>
}

export interface HistoryModel {
  provider: HistoryProvider
  model: string
  totals: TokenTotals
  costUsd: number | null
}

export interface HistoryProviderTotals {
  provider: HistoryProvider
  requests: number
  tokens: number
  costUsd: number | null
}

/** Estimated cost split by token kind (priced records only). */
export interface HistoryCostByType {
  input: number
  cacheRead: number
  cacheWrite: number
  output: number
}

export interface HistoryReport {
  generatedAt: string
  days: number
  totals: TokenTotals & { costUsd: number | null }
  byDay: HistoryDay[]
  byModel: HistoryModel[]
  byProvider: HistoryProviderTotals[]
  costByType: HistoryCostByType | null
  /** What cache reads saved versus paying the full input rate, or null without prices. */
  cacheSavingsUsd: number | null
  /** Tokens by local weekday (0 = Sunday) and hour (0-23). */
  heatmap: number[][]
  /** ISO time the price table was fetched, or null when costs are unavailable. */
  pricesAsOf: string | null
  /** Providers whose logs were found. */
  providersScanned: HistoryProvider[]
}

export function totalTokens(t: TokenTotals): number {
  return t.input + t.output + t.cacheRead + t.cacheWrite
}
