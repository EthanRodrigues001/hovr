/**
 * Timeline: every limit window as a lane on a shared 14-day calendar (a week back, a
 * week ahead). Each lane shows the window that ended just before, the current window
 * with how much of it is used, and the next one. Windows repeat on a fixed cadence, so
 * all of it follows from one reading (reset time + window length).
 */
import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import type { ProviderId, UsageWindow } from '../../../shared/usage'
import { remainingPercent } from '../../../shared/usageMath'
import { paceOf } from '../../../shared/usageMath'
import { forecastOf } from '../../../shared/forecast'
import { span, weekdayTime } from '../../lib/format'
import { PROVIDER_META, remainingTone } from '../../lib/providers'
import { useStore } from '../../store/appStore'
import { ProviderRing } from '../ProviderRing'
import { Segmented } from '../ui'
import { useHeatTip } from './HeatTip'

const DAY = 86_400_000

interface Lane {
  key: string
  window: UsageWindow
  startsAt: number
  resetsAt: number
  length: number
}

interface Flat extends Lane {
  provider: ProviderId
  name: string
}

interface Group {
  provider: ProviderId
  name: string
  plan?: string
  lanes: Lane[]
}

const shortDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function TimelineTab() {
  const [axisDays, setAxisDays] = useState<14 | 28>(14)
  const backDays = axisDays / 2
  const providers = useStore((s) => s.providers)
  const usage = useStore((s) => s.usage)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  const tip = useHeatTip()

  const axisStart = useMemo(() => {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d.getTime() - backDays * DAY
  }, [now, backDays])
  const axisLen = axisDays * DAY
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - axisStart) / axisLen) * 100))

  const { groups, skipped } = useMemo(() => {
    const out: Group[] = []
    let skip = 0
    for (const p of providers) {
      if (!p.enabled || !p.installed || !p.supportsLimits) continue
      const lanes: Lane[] = []
      for (const w of usage[p.id]?.windows ?? []) {
        const resetsAt = w.resetsAt ? Date.parse(w.resetsAt) : NaN
        if (!Number.isFinite(resetsAt) || !w.windowDurationMins) {
          skip++
          continue
        }
        const length = w.windowDurationMins * 60_000
        lanes.push({ key: `${p.id}:${w.id}`, window: w, startsAt: resetsAt - length, resetsAt, length })
      }
      if (lanes.length) out.push({ provider: p.id, name: PROVIDER_META[p.id].short, plan: p.plan, lanes })
    }
    return { groups: out, skipped: skip }
  }, [providers, usage])

  const flat: Flat[] = useMemo(
    () => groups.flatMap((g) => g.lanes.map((l) => ({ ...l, provider: g.provider, name: g.name }))),
    [groups]
  )
  const upcoming = useMemo(() => [...flat].sort((a, b) => a.resetsAt - b.resetsAt), [flat])
  const tightest = useMemo(() => [...flat].sort((a, b) => b.window.usedPercent - a.window.usedPercent)[0], [flat])
  const fastest = useMemo(() => {
    let best: { lane: Flat; ratio: number } | null = null
    for (const l of flat) {
      const r = forecastOf(l.window, now)?.paceRatio
      if (r != null && (!best || r > best.ratio)) best = { lane: l, ratio: r }
    }
    return best
  }, [flat, now])

  const days = Array.from({ length: axisDays }, (_, i) => axisStart + i * DAY)
  const today = new Date(now).setHours(0, 0, 0, 0)
  const nowPct = pct(now)

  if (groups.length === 0) {
    return (
      <div className="an-empty">
        <p>No limits with a known reset time yet.</p>
        <p className="muted">The timeline needs each limit's reset time and window length.</p>
      </div>
    )
  }

  return (
    <div className="hm-wrap tl-page" ref={tip.ref}>
      <div className="statstrip tl-stats">
        <div>
          <div className="stat-l">Next reset</div>
          <div className="stat-v">{span(Math.max(0, upcoming[0].resetsAt - now))}</div>
          <div className="stat-s">{upcoming[0].name} {upcoming[0].window.label}</div>
        </div>
        <div>
          <div className="stat-l">Most used</div>
          <div className="stat-v">{Math.round(tightest.window.usedPercent)}%</div>
          <div className="stat-s">{tightest.name} {tightest.window.label}</div>
        </div>
        <div>
          <div className="stat-l">Fastest pace</div>
          <div className="stat-v">{fastest ? `${fastest.ratio.toFixed(1)}x` : '–'}</div>
          <div className="stat-s">{fastest ? `${fastest.lane.name} ${fastest.lane.window.label}` : 'Too early to tell'}</div>
        </div>
        <div>
          <div className="stat-l">Limits tracked</div>
          <div className="stat-v">{flat.length}</div>
          <div className="stat-s">{groups.length} {groups.length === 1 ? 'provider' : 'providers'}</div>
        </div>
      </div>
      <div className="tl-tools">
        <span className="muted">Each limit as a window on the calendar: the one that ended, the current one, and the next.</span>
        <Segmented<14 | 28> value={axisDays} onChange={setAxisDays} options={[{ value: 14, label: '2 weeks' }, { value: 28, label: '4 weeks' }]} />
      </div>
      <div className="tl" style={{ '--cols': axisDays } as CSSProperties}>
      <div className="tl-head">
        <div className="tl-left tl-title">
          Limit <span>· Used</span>
        </div>
        <div className="tl-days">
          {days.map((d) => (
            <div key={d} className={d === today ? 'on' : ''}>
              <span>{new Date(d).toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <b>{shortDate(d)}</b>
            </div>
          ))}
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.provider} className="tl-group">
          <div className="tl-row tl-ghead">
            <div className="tl-left">
              <ProviderRing id={g.provider} remaining={Math.min(...g.lanes.map((l) => remainingPercent(l.window)))} size={22} />
              <b>{g.name}</b>
              {g.plan && <em>{g.plan}</em>}
              <span>
                {g.lanes.length} {g.lanes.length === 1 ? 'limit' : 'limits'}
              </span>
            </div>
            <div className="tl-lane">
              <i className="tl-past" style={{ width: `${nowPct}%` }} />
              <i className="tl-today" style={{ left: `${pct(today)}%` }} />
              <i className="tl-now" style={{ left: `${nowPct}%` }} />
            </div>
          </div>
          {g.lanes.map((l) => {
            const used = Math.max(0, Math.min(100, l.window.usedPercent))
            const tone = remainingTone(remainingPercent(l.window))
            const pace = paceOf(l.window, now)
            const fc = forecastOf(l.window, now)
            const runOut = fc && fc.runOutAt !== null && fc.runOutAt > now && fc.elapsed >= 0.05 ? fc.runOutAt : null
            const prevStart = l.startsAt - l.length
            const nextEnd = l.resetsAt + l.length
            const cur = { left: pct(l.startsAt), right: pct(l.resetsAt) }
            const narrow = cur.right - cur.left < 14
            const elapsed = Math.max(0, Math.min(1, (now - l.startsAt) / l.length))
            const info = (
              <>
                <b>
                  {g.name} · {l.window.label}
                </b>
                <span>
                  {Math.round(used)}% used{pace ? ` · ${pace === 'ahead' ? 'ahead of pace' : pace === 'under' ? 'under pace' : 'on pace'}` : ''}
                </span>
                <span>
                  {weekdayTime(l.startsAt, now)} → {weekdayTime(l.resetsAt, now)}
                </span>
                <span>Resets in {span(Math.max(0, l.resetsAt - now))}</span>
                {runOut !== null && fc && (
                  <span className="tl-warn">
                    Runs out {weekdayTime(runOut, now)} · locked {span(fc.lockedMs)}
                  </span>
                )}
              </>
            )
            return (
              <div key={l.key} className="tl-row" style={{ '--acc': PROVIDER_META[g.provider].accent } as CSSProperties}>
                <div className="tl-left tl-limit">
                  <span className="tl-name" title={l.window.label}>
                    {l.window.label}
                  </span>
                  <span className={`tl-chip tone-chip-${tone}`}>
                    <i />
                    {Math.round(used)}%
                  </span>
                </div>
                <div className="tl-lane" style={{ '--acc': PROVIDER_META[g.provider].accent } as CSSProperties}>
                  <i className="tl-past" style={{ width: `${nowPct}%` }} />
                  <i className="tl-today" style={{ left: `${pct(today)}%` }} />
                  {pct(l.startsAt) - pct(prevStart) > 5 && pct(l.startsAt) > 0 && (
                    <div
                      className="tl-block tl-ended"
                      style={{ left: `${pct(prevStart)}%`, width: `${pct(l.startsAt) - pct(prevStart)}%` }}
                    >
                      <span>Ended {shortDate(l.startsAt)}</span>
                    </div>
                  )}
                  <div
                    className={`tl-block tl-cur tl-tone-${tone}`}
                    style={{ left: `${cur.left}%`, width: `${Math.max(0.6, cur.right - cur.left)}%`, '--used': `${used}%` } as CSSProperties}
                    onMouseEnter={(e) => tip.show(e, info)}
                    onMouseLeave={tip.hide}
                  >
                    {!narrow && (
                      <span>
                        {Math.round(used)}% Used · {weekdayTime(l.resetsAt, now)}
                        {runOut !== null && <em className="tl-warn"> · out {weekdayTime(runOut, now)}</em>}
                      </span>
                    )}
                    <div className="tl-prog">
                      <i style={{ width: `${used}%` }} />
                      <u style={{ left: `${elapsed * 100}%` }} />
                    </div>
                  </div>
                  {!narrow && runOut !== null && pct(runOut) < 100 && pct(l.resetsAt) - pct(runOut) > 0.4 && (
                    <i className="tl-lock" style={{ left: `${pct(runOut)}%`, width: `${pct(l.resetsAt) - pct(runOut)}%` }} />
                  )}
                  {narrow && (
                    <div className="tl-outside" style={{ left: `${cur.right + 2.4}%` }}>
                      <span>
                        {Math.round(used)}% Used · resets {weekdayTime(l.resetsAt, now)}
                      </span>
                      <div className="tl-mini">
                        <i style={{ width: `${used}%` }} />
                        <u style={{ left: `${elapsed * 100}%` }} />
                      </div>
                      {runOut !== null && fc && <span className="tl-warn">Out ~{weekdayTime(runOut, now)}</span>}
                    </div>
                  )}
                  {pct(l.resetsAt) < 100 && !narrow && (
                    <div className="tl-block tl-next" style={{ left: `${pct(l.resetsAt)}%`, width: `${pct(nextEnd) - pct(l.resetsAt)}%` }}>
                      <span>Next · {shortDate(nextEnd)}</span>
                    </div>
                  )}
                  <i className="tl-now" style={{ left: `${nowPct}%` }} />
                </div>
              </div>
            )
          })}
        </section>
      ))}
      </div>
      <section className="sec tl-up">
        <header className="sec-head">
          <h3>Upcoming resets</h3>
          <span className="muted">soonest first</span>
        </header>
        <div className="tl-uplist">
          {upcoming.map((l) => {
            const used = Math.max(0, Math.min(100, l.window.usedPercent))
            return (
              <div key={l.key} className="tl-uprow" style={{ '--acc': PROVIDER_META[l.provider].accent } as CSSProperties}>
                <ProviderRing id={l.provider} remaining={100 - used} size={20} />
                <span className="tl-upname">
                  {l.name} <em>{l.window.label}</em>
                </span>
                <span className="tl-upbar">
                  <i style={{ width: `${used}%` }} />
                </span>
                <span className="tl-upused">{Math.round(used)}% used</span>
                <span className="tl-upwhen">
                  {weekdayTime(l.resetsAt, now)}
                  <small>in {span(Math.max(0, l.resetsAt - now))}</small>
                </span>
              </div>
            )
          })}
        </div>
      </section>
      {skipped > 0 && <p className="muted tl-note">{skipped} limit{skipped === 1 ? '' : 's'} without a reset time or length are not shown.</p>}
      {tip.node}
    </div>
  )
}
