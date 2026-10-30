/**
 * History tab: how many tokens (and roughly how many dollars) your coding agents
 * used, read from their local session logs. Separate from the live limits: this is
 * what you spent, not what you have left.
 */
import { useEffect, useState } from 'react'
import type { HistoryDay, HistoryProvider, HistoryReport } from '../../../shared/history'
import { totalTokens } from '../../../shared/history'
import { edge } from '../../lib/edge'
import { PROVIDER_META } from '../../lib/providers'
import { useStore } from '../../store/appStore'
import { Segmented } from '../ui'

const RANGES = [7, 30, 90] as const
const PROVIDERS: readonly HistoryProvider[] = ['claude', 'codex']

function compact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`
  return String(n)
}

function usd(n: number | null): string {
  if (n === null) return '–'
  return n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`
}

function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Chart({ days }: { days: HistoryDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.tokens))
  return (
    <div className="hchart" role="img" aria-label="Tokens per day">
      <div className="hchart-bars">
        {days.map((d) => (
          <div
            key={d.date}
            className="hbar"
            title={`${dayLabel(d.date)}: ${compact(d.tokens)} tokens${d.costUsd !== null ? ` · ${usd(d.costUsd)}` : ''}`}
          >
            <div className="hbar-stack" style={{ height: `${(d.tokens / max) * 100}%` }}>
              {PROVIDERS.map((p) => {
                const t = d.byProvider[p] ?? 0
                return t > 0 ? (
                  <div key={p} className="hseg" style={{ flex: t, background: PROVIDER_META[p].accent }} />
                ) : null
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="hchart-axis">
        <span>{dayLabel(days[0].date)}</span>
        <span>peak {compact(max)}/day</span>
        <span>{dayLabel(days[days.length - 1].date)}</span>
      </div>
    </div>
  )
}

export function HistoryTab() {
  const [days, setDays] = useState<number>(30)
  const [report, setReport] = useState<HistoryReport | null>(null)
  const [failed, setFailed] = useState(false)
  const showCosts = useStore((s) => s.settings.showCostEstimates)

  useEffect(() => {
    let cancelled = false
    setReport(null)
    setFailed(false)
    edge
      .getHistory(days)
      .then((r) => !cancelled && setReport(r))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [days, showCosts])

  return (
    <div className="tab-body">
      <div className="tab-head">
        <div>
          <h2>History</h2>
          <p className="muted">Tokens used by Claude Code and Codex, read from their session logs on this PC.</p>
        </div>
        <Segmented<number>
          value={days}
          onChange={setDays}
          options={RANGES.map((n) => ({ value: n, label: `${n}d` }))}
        />
      </div>

      {failed && <p className="muted">Could not read the session logs.</p>}
      {!report && !failed && <p className="muted">Reading session logs… the first scan can take a few seconds.</p>}

      {report && report.providersScanned.length === 0 && (
        <p className="muted">No Claude Code or Codex session logs were found in this period.</p>
      )}

      {report && report.providersScanned.length > 0 && (
        <>
          <div className="hstats">
            <div className="hstat">
              <div className="hstat-v">{compact(totalTokens(report.totals))}</div>
              <div className="hstat-l">tokens</div>
            </div>
            <div className="hstat">
              <div className="hstat-v">{showCosts ? usd(report.totals.costUsd) : '–'}</div>
              <div className="hstat-l">{showCosts ? 'est. API cost' : 'costs off'}</div>
            </div>
            <div className="hstat">
              <div className="hstat-v">{compact(report.totals.requests)}</div>
              <div className="hstat-l">requests</div>
            </div>
          </div>

          <Chart days={report.byDay} />
          <div className="hlegend">
            {report.providersScanned.map((p) => (
              <span key={p}>
                <i style={{ background: PROVIDER_META[p].accent }} />
                {PROVIDER_META[p].short}
              </span>
            ))}
            <span className="hlegend-note">
              {compact(report.totals.input)} fresh in · {compact(report.totals.output)} out ·{' '}
              {compact(report.totals.cacheRead)} cache read
            </span>
          </div>

          <h3 className="hhead">By model</h3>
          <table className="htable">
            <tbody>
              {report.byModel.slice(0, 12).map((m) => (
                <tr key={`${m.provider}:${m.model}`}>
                  <td>
                    <i style={{ background: PROVIDER_META[m.provider].accent }} />
                    {m.model}
                  </td>
                  <td className="num">{compact(totalTokens(m.totals))}</td>
                  <td className="num">{showCosts ? usd(m.costUsd) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="muted hfoot">
            {showCosts
              ? report.pricesAsOf
                ? `Dollar figures are what this usage would cost at public API list prices (not your subscription bill) (updated ${new Date(report.pricesAsOf).toLocaleDateString()}). Models without a known price show –.`
                : 'Prices could not be downloaded, so dollar figures are unavailable.'
              : 'Dollar estimates are turned off in General.'}
          </p>
        </>
      )}
    </div>
  )
}
