/**
 * Forecast: one row per limit window across a shared 7-day axis starting now. Each
 * cell shows the projected use at that time if the pace so far holds; a red dot is
 * where the allowance runs out, hatching is the time locked until the reset.
 */
import { useEffect, useMemo, useState } from 'react'
import { edge } from '../../lib/edge'
import { Area, AreaChart, CartesianGrid, ReferenceDot, Tooltip, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { type Forecast, forecastOf, projectedUsedAt } from '../../../shared/forecast'
import type { ProviderId, UsageSample, UsageWindow } from '../../../shared/usage'
import { span, weekdayTime } from '../../lib/format'
import { PROVIDER_META } from '../../lib/providers'
import { useStore } from '../../store/appStore'
import { ProviderRing } from '../ProviderRing'
import { useHeatTip } from './HeatTip'
import { LimitRings } from './LimitRings'
import { SegmentBar } from './SegmentBar'

const DAY = 86_400_000
const AXIS_DAYS = 7
const CELLS = 28
const CELL_MS = (AXIS_DAYS * DAY) / CELLS

interface Item {
  key: string
  provider: ProviderId
  providerLabel: string
  plan?: string
  window: UsageWindow
  forecast: Forecast
}

function shade(used: number): number {
  return used < 25 ? 1 : used < 50 ? 2 : used < 75 ? 3 : 4
}

function Strip({ item, now }: { item: Item; now: number }) {
  const { forecast: f } = item
  const tip = useHeatTip()
  const cells = []
  for (let i = 0; i < CELLS; i++) {
    const t0 = now + i * CELL_MS
    const t1 = t0 + CELL_MS
    const mid = t0 + CELL_MS / 2
    let cls = 'fc-cell'
    if (t0 >= f.resetsAt) cls += ' fc-none'
    else if (f.runOutAt !== null && t0 <= f.runOutAt && f.runOutAt < t1) cls += ' fc-out'
    else if (f.runOutAt !== null && mid > f.runOutAt) cls += ' fc-locked'
    else if (f.projectedAtReset === null) cls += ' fc-none'
    else cls += ` fc-s${shade(projectedUsedAt(f, mid, now))}`
    const resetHere = f.resetsAt >= t0 && f.resetsAt < t1
    const used = f.projectedAtReset === null || t0 >= f.resetsAt ? null : projectedUsedAt(f, mid, now)
    const note =
      t0 >= f.resetsAt
        ? 'After reset: not forecast'
        : f.runOutAt !== null && t0 <= f.runOutAt && f.runOutAt < t1
          ? 'Runs out here'
          : f.runOutAt !== null && mid > f.runOutAt
            ? 'Locked until reset'
            : used === null
              ? 'Too early to forecast'
              : `~${Math.round(used)}% used`
    cells.push(
      <i
        key={i}
        className={cls}
        onMouseEnter={(e) =>
          tip.show(
            e,
            <>
              <b>{weekdayTime(mid, now)}</b>
              <span>{note}</span>
            </>
          )
        }
        onMouseLeave={tip.hide}
      >
        {resetHere && <b className="fc-reset" />}
      </i>
    )
  }
  return (
    <div className="fc-strip hm-wrap" ref={tip.ref}>
      {cells}
      {tip.node}
    </div>
  )
}

function rowText(f: Forecast, now: number): { top: string; bottom: string } {
  const resets = `Resets ${weekdayTime(f.resetsAt, now)}`
  if (f.runOutAt !== null) {
    return { top: f.runOutAt <= now ? 'Out now' : `Runs out ${weekdayTime(f.runOutAt, now)}`, bottom: resets }
  }
  if (f.projectedAtReset === null) return { top: 'Too early to forecast', bottom: resets }
  return { top: `~${Math.round(f.projectedAtReset)}% at reset`, bottom: resets }
}

interface ChartPoint {
  t: number
  even: number
  actual?: number
  projected?: number
}

function FcTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="tip">
      <div className="tip-h">{weekdayTime(p.t)}</div>
      {p.actual !== undefined && (
        <div className="tip-r"><i style={{ background: '#fff' }} /><span>Used</span><b>{Math.round(p.actual)}%</b></div>
      )}
      {p.projected !== undefined && p.actual === undefined && (
        <div className="tip-r"><i style={{ background: '#f87171' }} /><span>At current pace</span><b>{Math.round(p.projected)}%</b></div>
      )}
      <div className="tip-r"><i style={{ background: 'rgba(255,255,255,0.5)' }} /><span>Even pace</span><b>{Math.round(p.even)}%</b></div>
    </div>
  )
}

function Detail({ item, now }: { item: Item; now: number }) {
  const { forecast: f, window } = item
  const accent = PROVIDER_META[item.provider].accent
  const [samples, setSamples] = useState<UsageSample[]>([])
  useEffect(() => {
    let cancelled = false
    setSamples([])
    void edge.getSamples(item.provider, window.id, f.startsAt).then((r) => !cancelled && setSamples(r)).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [item.provider, window.id, f.startsAt, f.usedNow])
  const data = useMemo(() => {
    const steps = 24
    const even = (t: number) => Math.max(0, Math.min(100, ((t - f.startsAt) / (f.resetsAt - f.startsAt)) * 100))
    const out: ChartPoint[] = []
    for (let i = 0; i <= steps; i++) {
      const t = f.startsAt + ((f.resetsAt - f.startsAt) * i) / steps
      out.push({ t, even: even(t), ...(t >= now ? { projected: projectedUsedAt(f, t, now) } : {}) })
    }
    // Real readings: what was actually used so far, ending at the current value.
    const past = samples.filter((p) => p.t >= f.startsAt && p.t < now)
    for (const p of past) out.push({ t: p.t, even: even(p.t), actual: p.used })
    out.push({ t: now, even: even(now), actual: f.usedNow, projected: f.usedNow })
    return out.sort((x, y) => x.t - y.t)
  }, [f, now, samples])
  const id = `fcg-${item.key.replace(/[^a-z0-9]/gi, '')}`

  return (
    <aside className="fc-detail">
      <div className="fc-detail-head">
        <ProviderRing id={item.provider} remaining={100 - f.usedNow} size={30} />
        <div>
          <div className="fc-detail-name">{item.providerLabel}</div>
          <div className="muted">{[item.plan, window.label].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <p className="fc-detail-line">
        Used {Math.round(f.usedNow)}% in {Math.round(f.elapsed * 100)}% of the window
      </p>
      <div className="fc-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.5} />
                <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} hide />
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
            <Area type="linear" dataKey="even" stroke="rgba(255,255,255,0.35)" strokeDasharray="2 4" strokeWidth={1.2} fill="none" dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="actual" stroke={accent} strokeWidth={2} fill={`url(#${id})`} dot={false} connectNulls isAnimationActive={false} />
            <Area type="linear" dataKey="projected" stroke={accent} strokeOpacity={0.8} strokeWidth={1.8} strokeDasharray="5 4" fill="none" dot={false} connectNulls isAnimationActive={false} />
            <Tooltip content={<FcTip />} cursor={{ stroke: 'rgba(255,255,255,0.25)', strokeDasharray: '3 3' }} />
            <ReferenceLine x={now} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
            <ReferenceDot x={now} y={f.usedNow} r={4} fill="#fff" stroke="none" />
            {f.runOutAt !== null && f.runOutAt > now && <ReferenceDot x={f.runOutAt} y={100} r={4} fill="#f87171" stroke="none" />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="fc-legend">
        <span><i style={{ background: '#fff' }} />Now</span>
        <span><i style={{ background: accent }} />Used so far</span>
        <span><i className="dash" style={{ background: `repeating-linear-gradient(90deg, ${accent} 0 3px, transparent 3px 5px)` }} />At current pace</span>
        <span><i className="dash" />Even pace</span>
        <span><i style={{ background: '#f87171' }} />Runs out</span>
      </div>
      <div className="fc-stats">
        <div>
          <div className="stat-l">Pace</div>
          <div className="stat-v">{f.paceRatio === null ? '–' : `${f.paceRatio.toFixed(1)}x`}</div>
        </div>
        <div>
          <div className="stat-l">Runs out</div>
          <div className="stat-v">{f.runOutAt !== null ? weekdayTime(f.runOutAt, now) : f.projectedAtReset === null ? '–' : 'Lasts'}</div>
        </div>
        <div>
          <div className="stat-l">Locked before reset</div>
          <div className="stat-v">{f.lockedMs > 0 ? span(f.lockedMs) : '–'}</div>
        </div>
      </div>
    </aside>
  )
}

export function ForecastTab() {
  const providers = useStore((s) => s.providers)
  const usage = useStore((s) => s.usage)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const items = useMemo(() => {
    const out: Item[] = []
    for (const p of providers) {
      if (!p.enabled || !p.installed || !p.supportsLimits) continue
      for (const w of usage[p.id]?.windows ?? []) {
        const forecast = forecastOf(w, now)
        if (forecast) out.push({ key: `${p.id}:${w.id}`, provider: p.id, providerLabel: PROVIDER_META[p.id].short, plan: p.plan, window: w, forecast })
      }
    }
    const rank = (i: Item) =>
      i.forecast.runOutAt !== null ? i.forecast.runOutAt : i.forecast.projectedAtReset !== null ? 1e15 - i.forecast.projectedAtReset : 2e15
    return out.sort((a, b) => rank(a) - rank(b))
  }, [providers, usage, now])

  const [selected, setSelected] = useState<string | null>(null)
  const current = items.find((i) => i.key === selected) ?? items[0]

  if (items.length === 0) {
    return (
      <div className="an-empty">
        <p>No forecastable limits yet.</p>
        <p className="muted">A forecast needs a limit with a known reset time. Connect Claude, Codex or another supported tool in Settings.</p>
      </div>
    )
  }

  const outs = items.filter((i) => i.forecast.runOutAt !== null)
  const headline =
    outs.length === 0 ? 'Every limit lasts until it resets' : `${outs.length} ${outs.length === 1 ? 'limit runs' : 'limits run'} out before reset`
  const first = outs[0]
  const sub = first
    ? `${first.providerLabel} ${first.window.label} first, ${weekdayTime(first.forecast.runOutAt!, now)}, then locked ${span(first.forecast.lockedMs)}`
    : 'If the current pace holds, nothing runs dry.'

  const days = Array.from({ length: AXIS_DAYS }, (_, i) =>
    new Date(now + i * DAY).toLocaleDateString(undefined, { weekday: 'short' })
  )

  return (
    <div className="fc">
      <section className="fc-main">
        <h2 className="an-h2">{headline}</h2>
        <p className="muted">{sub}</p>
        <SegmentBar
          segments={[
            { label: 'Last until reset', value: items.filter((i) => i.forecast.runOutAt === null && i.forecast.projectedAtReset !== null).length, color: '#4ade80' },
            { label: 'Run out', value: outs.length, color: '#f87171' },
            { label: 'Too early', value: items.filter((i) => i.forecast.projectedAtReset === null).length, color: '#475569' }
          ]}
        />
        <div className="fc-axis">
          <span className="fc-axis-name" />
          <div className="fc-days">
            {days.map((d, i) => (
              <span key={i}>{i === 0 ? 'Now' : d}</span>
            ))}
          </div>
          <span className="fc-axis-text" />
        </div>
        <div className="fc-rows">
          {items.map((item) => {
            const text = rowText(item.forecast, now)
            return (
              <button key={item.key} className={`fc-row ${item === current ? 'on' : ''}`} onClick={() => setSelected(item.key)}>
                <span className="fc-name">
                  <ProviderRing id={item.provider} remaining={100 - item.forecast.usedNow} size={20} />
                  <span>
                    {item.providerLabel} <em>{item.window.label}</em>
                  </span>
                </span>
                <Strip item={item} now={now} />
                <span className="fc-text">
                  <b className={item.forecast.runOutAt !== null ? 'bad' : ''}>{text.top}</b>
                  <small>{text.bottom}</small>
                </span>
              </button>
            )
          })}
        </div>
        <div className="fc-key">
          <span>Projected use</span>
          <i className="fc-cell fc-s1" />
          <i className="fc-cell fc-s2" />
          <i className="fc-cell fc-s3" />
          <i className="fc-cell fc-s4" />
          <span>under 25, 50, 75, 100%</span>
          <i className="fc-cell fc-out" />
          <span>Runs out</span>
          <i className="fc-cell fc-locked" />
          <span>Locked until reset</span>
          <b className="fc-reset-key" />
          <span>Reset</span>
        </div>
        <p className="muted fc-note">Assumes the pace so far holds. A new window after reset is not forecast. Select a row for detail.</p>
        <table className="sp-table fc-table">
          <thead>
            <tr><th>Limit</th><th className="num">Used</th><th className="num">Left</th><th className="num">Resets in</th><th className="num">Pace</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.key} className={i === current ? 'on' : ''} onClick={() => setSelected(i.key)}>
                <td>
                  <div className="sp-name"><i style={{ background: PROVIDER_META[i.provider].accent }} />{i.providerLabel} <span className="muted">{i.window.label}</span></div>
                </td>
                <td className="num">{i.forecast.usedNow < 10 && i.forecast.usedNow > 0 ? i.forecast.usedNow.toFixed(1) : Math.round(i.forecast.usedNow)}%</td>
                <td className="num">{(100 - i.forecast.usedNow) > 95 && i.forecast.usedNow > 0 ? (100 - i.forecast.usedNow).toFixed(1) : Math.round(100 - i.forecast.usedNow)}%</td>
                <td className="num">{span(Math.max(0, i.forecast.resetsAt - now))}</td>
                <td className="num">{i.forecast.paceRatio === null ? '–' : `${i.forecast.paceRatio.toFixed(1)}x`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {current && (
        <div className="fc-side">
          <LimitRings
            items={items.map((i) => {
              const label = i.window.label.replace('Claude & GPT (shared) · ', '')
              // "Cursor" + "Cursor Models" should read "Cursor Models", not "Cursor Cursor Models".
              const name = label.toLowerCase().startsWith(i.providerLabel.toLowerCase()) ? label : `${i.providerLabel} ${label}`
              const f = i.forecast
              const used = f.usedNow < 10 && f.usedNow > 0 ? f.usedNow.toFixed(1) : String(Math.round(f.usedNow))
              return {
                key: i.key,
                summary: rowText(f, now).top,
                name: name.length > 26 ? `${name.slice(0, 25)}…` : name,
                fullName: name,
                accent: PROVIDER_META[i.provider].accent,
                forecast: f,
                rows: [
                  ['Used', `${used}%`],
                  ['Left', `${Math.round(100 - f.usedNow)}%`],
                  ['Resets in', span(Math.max(0, f.resetsAt - now))],
                  ...(f.paceRatio === null ? [] : [['Pace', `${f.paceRatio.toFixed(1)}x`] as [string, string]])
                ] as Array<[string, string]>
              }
            })}
            selected={current.key}
            onSelect={setSelected}
            center={{ top: outs.length === 0 ? 'All clear' : `${outs.length} run out`, bottom: 'before reset' }}
          />
          <Detail item={current} now={now} />
        </div>
      )}
    </div>
  )
}
