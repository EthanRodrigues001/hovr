/**
 * Cursor keeps no token logs on disk, so its history comes from the same dashboard service the
 * limits read: `GetFilteredUsageEvents` lists one event per model request with its token counts
 * and the cost Cursor itself computed (`tokenUsage.totalCents`).
 */
import { readCursorToken } from '../providers/cursor'
import { isRecord, requestJson } from '../providers/util'
import type { UsageRecord } from './parse'

const ENDPOINT = 'https://api2.cursor.sh/aiserver.v1.DashboardService/GetFilteredUsageEvents'
const PAGE_SIZE = 500
const MAX_PAGES = 12
const MEMO_MS = 5 * 60_000

function num(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0
}

/** Pure: one API response page -> usage records. */
export function parseCursorEvents(body: unknown): UsageRecord[] {
  if (!isRecord(body) || !Array.isArray(body.usageEventsDisplay)) return []
  const out: UsageRecord[] = []
  for (const e of body.usageEventsDisplay) {
    if (!isRecord(e)) continue
    const timestampMs = num(e.timestamp)
    if (timestampMs <= 0) continue
    const t = isRecord(e.tokenUsage) ? e.tokenUsage : {}
    const cents = num(t.totalCents)
    out.push({
      provider: 'cursor',
      timestampMs,
      model: typeof e.model === 'string' && e.model ? e.model : 'unknown',
      input: Math.floor(num(t.inputTokens)),
      output: Math.floor(num(t.outputTokens)),
      cacheRead: Math.floor(num(t.cacheReadTokens)),
      cacheWrite: Math.floor(num(t.cacheWriteTokens)),
      dedupeKey: typeof e.usageEventId === 'string' ? `cursor:${e.usageEventId}` : null,
      reportedCostUsd: cents > 0 ? cents / 100 : e.isTokenBasedCall === false ? null : 0
    })
  }
  return out
}

let memo: { at: number; days: number; records: UsageRecord[] } | null = null

/** Every event in the last `days` days, or [] when Cursor is not signed in or unreachable. */
export async function readCursorHistory(days: number, env: NodeJS.ProcessEnv = process.env): Promise<UsageRecord[]> {
  if (memo && memo.days >= days && Date.now() - memo.at < MEMO_MS) {
    const since = Date.now() - days * 86_400_000
    return memo.records.filter((r) => r.timestampMs >= since)
  }
  const auth = await readCursorToken(env)
  if (!('token' in auth)) return []
  const endDate = Date.now()
  const startDate = endDate - days * 86_400_000
  const records: UsageRecord[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await requestJson({
      url: ENDPOINT,
      method: 'POST',
      headers: {
        authorization: `Bearer ${auth.token}`,
        'connect-protocol-version': '1',
        'x-cursor-client-type': 'cli'
      },
      body: { startDate: String(startDate), endDate: String(endDate), page, pageSize: PAGE_SIZE },
      label: 'Cursor',
      authHint: 'Sign in to Cursor again.'
    })
    if (!res.ok) return memo?.records ?? []
    const batch = parseCursorEvents(res.json)
    records.push(...batch)
    const total = isRecord(res.json) ? num(res.json.totalUsageEventsCount) : 0
    if (batch.length === 0 || records.length >= total) break
  }
  memo = { at: Date.now(), days, records }
  return records
}
