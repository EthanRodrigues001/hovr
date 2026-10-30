/**
 * Spend: estimated API cost (what this usage would cost at public list prices, not a
 * subscription bill) with a daily area chart, totals, a cost-by-kind bar and a
 * model / day breakdown. Falls back to tokens when prices are off or unavailable.
 */
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HistoryProvider, HistoryReport } from '../../../shared/history'
import { totalTokens } from '../../../shared/history'
import { compact, dayLabel, percent, usd } from '../../lib/format'
import { PROVIDER_META } from '../../lib/providers'
import { useStore } from '../../store/appStore'
import { Segmented } from '../ui'
import { ReportGate } from './ReportGate'
import { TickBar } from './TickBar'

const PROVIDERS: readonly HistoryProvider[] = ['claude', 'codex', 'antigravity']
const KIND_COLORS = { input: '#454a9a', cacheRead: '#6a6fd0', cacheWrite: '#8b8fff', output: '#d6d8ff' } as const

function ChartTooltip({ active, payload, label, money }: { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: string; money: boolean }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => p.value > 0)
  return (
    <div className="tip">
      <div className="tip-h">{label ? dayLabel(label) : ''}</div>
      {rows.map((r) => (
        <div key={r.dataKey} className="tip-r">
          <i style={{ background: PROVIDER_META[r.dataKey as HistoryProvider].accent }} />
          <span>{PROVIDER_META[r.dataKey as HistoryProvider].short}</span>
          <b>{money ? usd(r.value) : compact(r.value)}</b>
        </div>
      ))}
    </div>
  )
}

function ShareTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; fill: string } }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="tip">
      <div className="tip-r">
        <i style={{ background: p.fill }} />
        <span>{p.name}</span>
        <b>{p.value}%</b>
      </div>
    </div>
  )
}

function Body({ report, days }: { report: HistoryReport; days: number }) {
  const showCosts = useStore((s) => s.settings.showCostEstimates)
  const priced = showCosts && report.totals.costUsd !== null
  const [by, setBy] = useState<'model' | 'day'>('model')

  const chartData = useMemo(
    () =>
      report.byDay.map((d) => ({
        date: d.date,
        claude: priced ? (d.costByProvider.claude ?? 0) : (d.byProvider.claude ?? 0),
        codex: priced ? (d.costByProvider.codex ?? 0) : (d.byProvider.codex ?? 0),
        antigravity: priced ? (d.costByProvider.antigravity ?? 0) : (d.byProvider.antigravity ?? 0)
      })),
    [report, priced]
  )
  const tokens = totalTokens(report.totals)
  const stackOrder = useMemo(() => {
    const t = (p: HistoryProvider) => report.byProvider.find((x) => x.provider === p)?.tokens ?? 0
    return PROVIDERS.filter((p) => t(p) > 0).sort((a, b) => t(a) - t(b))
  }, [report])
  const radial = report.byProvider.map((p) => ({
    name: PROVIDER_META[p.provider].short,
    value: Math.max(1, Math.round(((priced ? (p.costUsd ?? 0) / (report.totals.costUsd || 1) : p.tokens / (tokens || 1))) * 100)),
    fill: PROVIDER_META[p.provider].accent
  }))
  const headValue = priced ? usd(report.totals.costUsd) : compact(tokens)
  const share = (cost: number | null, toks: number) => (priced ? (report.totals.costUsd ? (cost ?? 0) / report.totals.costUsd : 0) : tokens ? toks / tokens : 0)

  const typeTotal = report.costByType ? Object.values(report.costByType).reduce((a, b) => a + b, 0) : 0
  const rows =
    by === 'model'
      ? report.byModel.map((m) => ({ key: `${m.provider}:${m.model}`, name: m.model, accent: PROVIDER_META[m.provider].accent, cost: m.costUsd, tokens: totalTokens(m.totals) }))
      : [...report.byDay].reverse().map((d) => ({ key: d.date, name: dayLabel(d.date), accent: '#a3a3a3', cost: d.costUsd, tokens: d.tokens }))
  const maxShare = Math.max(0.0001, ...rows.map((r) => share(r.cost, r.tokens)))

  return (
    <div className="sp">
      <div className="sp-top">
        <div className="sp-sum">
          <div className="sp-sumtop">
            <div>
              <div className="sp-big">{headValue}</div>
              <div className="muted">
                {priced ? 'API estimate' : 'tokens'} · {compact(report.totals.requests)} requests · {days}d
              </div>
            </div>
            <div className="sp-radial" title="Share by provider">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart data={radial} innerRadius="46%" outerRadius="100%" startAngle={90} endAngle={-270} barSize={9}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'rgba(255,255,255,0.06)' }} animationDuration={600} />
                  <Tooltip content={<ShareTip />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="sp-prov">
            {report.byProvider.map((p) => (
              <div key={p.provider} className="sp-prov-row">
                <div className="sp-prov-top">
                  <i style={{ background: PROVIDER_META[p.provider].accent }} />
                  <span className="sp-prov-name">{PROVIDER_META[p.provider].short}</span>
                  <small>{compact(p.requests)} requests</small>
                  <b>{priced ? usd(p.costUsd) : compact(p.tokens)}</b>
                </div>
                <div className="muted sp-prov-sub">
                  {percent(share(p.costUsd, p.tokens))} of {priced ? 'cost' : 'tokens'} · {compact(p.tokens)} tokens
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="sp-chart">
          <div className="sp-chart-title">{priced ? 'Daily cost' : 'Daily tokens'}</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
              <defs>
                {PROVIDERS.map((p) => (
                  <linearGradient key={p} id={`sp-${p}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PROVIDER_META[p].accent} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={PROVIDER_META[p].accent} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" />
              <XAxis dataKey="date" tickFormatter={dayLabel} axisLine={false} tickLine={false} minTickGap={48} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <YAxis width={44} axisLine={false} tickLine={false} tickFormatter={(v: number) => (priced ? `$${compact(v)}` : compact(v))} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <Tooltip content={<ChartTooltip money={priced} />} cursor={{ stroke: 'rgba(255,255,255,0.25)', strokeDasharray: '3 3' }} />
              {stackOrder.map((p) => (
                <Area key={p} type="monotone" dataKey={p} stackId="1" stroke={PROVIDER_META[p].accent} strokeWidth={1.6} fill={`url(#sp-${p})`} dot={false} animationDuration={500} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <div className="sp-legend">
            {report.byProvider.map((p) => (
              <span key={p.provider}><i style={{ background: PROVIDER_META[p.provider].accent }} />{PROVIDER_META[p.provider].short}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="statstrip">
        <div><div className="stat-l">Processed tokens</div><div className="stat-v">{compact(tokens)}</div></div>
        <div><div className="stat-l">Cached input</div><div className="stat-v">{compact(report.totals.cacheRead)}</div></div>
        <div><div className="stat-l">Uncached input</div><div className="stat-v">{compact(report.totals.input)}</div></div>
        <div><div className="stat-l">Output</div><div className="stat-v">{compact(report.totals.output)}</div></div>
        <div><div className="stat-l">Cache savings</div><div className="stat-v">{priced ? usd(report.cacheSavingsUsd) : '–'}</div></div>
      </div>

      {priced && report.costByType && typeTotal > 0 && (
        <section className="sec">
          <header className="sec-head"><h3>Cost by type</h3></header>
          <TickBar
            ticks={150}
            segments={([['input', 'Input'], ['cacheRead', 'Cache read'], ['cacheWrite', 'Cache write'], ['output', 'Output']] as const).map(([k, label]) => ({
              label,
              value: report.costByType![k],
              color: KIND_COLORS[k],
              display: usd(report.costByType![k])
            }))}
          />
        </section>
      )}

      <section className="sec">
      <div className="sec-head">
        <h3>Breakdown</h3>
        <Segmented<'model' | 'day'> value={by} onChange={setBy} options={[{ value: 'model', label: 'Model' }, { value: 'day', label: 'Day' }]} />
      </div>
      <table className="sp-table">
        <thead>
          <tr><th>#</th><th>{by === 'model' ? 'Model' : 'Day'}</th><th className="num">{priced ? 'Cost' : ''}</th><th className="num">Share</th><th className="num">Tokens</th></tr>
        </thead>
        <tbody>
          {rows.slice(0, by === 'model' ? 12 : 31).map((r, i) => {
            const s = share(r.cost, r.tokens)
            return (
              <tr key={r.key}>
                <td className="idx">{i + 1}</td>
                <td>
                  <div className="sp-name"><i style={{ background: r.accent }} />{r.name}</div>
                  <div className="sp-under" style={{ width: `${(s / maxShare) * 100}%`, background: r.accent }} />
                </td>
                <td className="num">{priced ? usd(r.cost) : ''}</td>
                <td className="num muted">{percent(s)}</td>
                <td className="num">{compact(r.tokens)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </section>
      <p className="muted sp-foot">
        {!showCosts
          ? 'Dollar estimates are turned off in Settings → General.'
          : report.pricesAsOf
            ? `Dollars are what this usage would cost at public API list prices, not your subscription bill (prices updated ${new Date(report.pricesAsOf).toLocaleDateString()}). Models without a known price show –.`
            : 'Prices could not be downloaded, so dollar figures are unavailable.'}
      </p>
    </div>
  )
}

export function SpendTab({ report, days }: { report: HistoryReport | null | 'failed'; days: number }) {
  return <ReportGate report={report}>{(r) => <Body report={r} days={days} />}</ReportGate>
}
