/** Number / date formatting shared by the usage card and the analytics views. */

export function compact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`
  return String(Math.round(n))
}

export function usd(n: number | null | undefined): string {
  if (n === null || n === undefined) return '–'
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
  return `$${n.toFixed(2)}`
}

export function percent(share: number): string {
  if (share > 0 && share < 0.001) return '<0.1%'
  return `${(share * 100).toFixed(1)}%`
}

/** "2026-10-30" -> "Oct 30" */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** "Fri 03:24"; the date is added when it is more than five days away. */
export function weekdayTime(ms: number, now = Date.now()): string {
  const d = new Date(ms)
  const day = d.toLocaleDateString(undefined, { weekday: 'short' })
  const date = Math.abs(ms - now) > 5 * 86_400_000 ? ` ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day}${date} ${time}`
}

/** "8h", "1d 15h", "40m" */
export function span(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60_000))
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 48) return `${h}h${mins % 60 >= 30 && h < 10 ? ' 30m' : ''}`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}
