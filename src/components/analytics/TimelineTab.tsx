/**
 * Timeline: every limit window as a lane on a shared 14-day calendar (a week back, a
 * week ahead). Each lane shows the window that ended just before, the current window
 * with how much of it is used, and the next one. Windows repeat on a fixed cadence, so
 * all of it follows from one reading (reset time + window length).
 */
import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ProviderId, UsageWindow } from '../../../shared/usage'
import { remainingPercent } from '../../../shared/usageMath'
import { paceOf } from '../../../shared/usageMath'
import { forecastOf } from '../../../shared/forecast'
import { span, weekdayTime } from '../../lib/format'
import { PROVIDER_META, remainingTone } from '../../lib/providers'
import { SegmentBar, type BarSegment } from './SegmentBar'
import { useStore } from '../../store/appStore'
import { ProviderRing } from '../ProviderRing'
import { ProviderLogo } from '../ProviderLogo'
import { ProviderPicker } from '../ProviderPicker'
import { useFloatTip } from './HeatTip'

const DAY = 86_400_000
const LEFT_COL = 220 // keep in step with --left in analytics.css

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

/** Counts how many limits reset within an hour, a day, a week, or later. */
function resetBuckets(lanes: Array<{ resetsAt: number }>, now: number): BarSegment[] {
  const left = (l: { resetsAt: number }) => l.resetsAt - now
  const n = (lo: number, hi: number) => lanes.filter((l) => left(l) >= lo && left(l) < hi).length
  const H = 3_600_000
  return [
    { label: 'Within an hour', value: n(-Infinity, H), color: '#6aa6c4' },
    { label: 'Within a day', value: n(H, 24 * H), color: '#4a7fb0' },
    { label: 'This week', value: n(24 * H, 7 * 24 * H), color: '#5560a8' },
    { label: 'Later', value: n(7 * 24 * H, Infinity), color: '#3b4656' }
  ]
}

export function TimelineTab() {
  const axisDays = 30
  const backDays = 0
  const providers = useStore((s) => s.providers)
  const usage = useStore((s) => s.usage)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  const tip = useFloatTip()

  // Mouse wheel over the chart zooms the range (3 to 30 days in view); Shift+wheel or a sideways swipe pans.
  const [view, setView] = useState(7)
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
  const anchor = useRef<{ day: number; px: number } | null>(null)
  useEffect(() => {
    const el = scroller
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const sideways = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)
      const onDates = (e.target as HTMLElement).closest('.tl-head') !== null
      // Plain wheel over the rows keeps scrolling the page; zoom needs Ctrl or the date row.
      if (!sideways && !e.ctrlKey && !onDates) return
      e.preventDefault()
      if (sideways) {
        el.scrollLeft += e.shiftKey ? e.deltaY : e.deltaX
        return
      }
      const laneW = el.clientWidth - LEFT_COL
      const px = Math.max(0, Math.min(laneW, e.clientX - el.getBoundingClientRect().left - LEFT_COL))
      setView((v) => {
        const next = Math.max(3, Math.min(axisDays, v * (e.deltaY > 0 ? 1.12 : 1 / 1.12)))
        anchor.current = { day: ((el.scrollLeft + px) * v) / laneW, px }
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [axisDays, scroller])
  useLayoutEffect(() => {
    const el = scroller
    const a = anchor.current
    if (!el || !a) return
    anchor.current = null
    const laneW = el.clientWidth - LEFT_COL
    el.scrollLeft = (a.day * laneW) / view - a.px
  }, [view, scroller])

  const axisStart = useMemo(() => {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d.getTime() - backDays * DAY
  }, [now, backDays])
  const axisLen = axisDays * DAY
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - axisStart) / axisLen) * 100))

  const [hidden, setHidden] = useState<ReadonlySet<ProviderId>>(new Set())
  const [pinned, setPinned] = useState<string | null>(null)

  const { allGroups, skipped } = useMemo(() => {
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
    return { allGroups: out, skipped: skip }
  }, [providers, usage])

  const groups = useMemo(() => allGroups.filter((g) => !hidden.has(g.provider)), [allGroups, hidden])
  const toggleProvider = (id: ProviderId) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (allGroups.length - next.size > 1) next.add(id) // keep at least one visible
      return next
    })

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

  /** The hover / pinned detail for one window. */
  const detail = (name: string, l: Lane) => {
    const used = Math.max(0, Math.min(100, l.window.usedPercent))
    const pace = paceOf(l.window, now)
    const fc = forecastOf(l.window, now)
    const runOut = fc && fc.runOutAt !== null && fc.runOutAt > now && fc.elapsed >= 0.05 ? fc.runOutAt : null
    return (
      <>
        <b>
          {name} · {l.window.label}
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
  }
  const pinnedLane = pinned ? flat.find((l) => l.key === pinned) : undefined

  if (allGroups.length === 0) {
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
      <section className="tl-resets">
        <h3>Resets by when</h3>
        <SegmentBar segments={resetBuckets(flat, now)} />
      </section>
      <div className="tl-tools">
        <h3>
          Limit windows <small>Scroll the dates or Ctrl + scroll to zoom · Shift + scroll to pan</small>
        </h3>
        {allGroups.length > 1 && (
          <ProviderPicker
            items={allGroups.map((g) => ({ id: g.provider, name: g.name }))}
            hidden={hidden}
            onToggle={toggleProvider}
          />
        )}
      </div>
      {pinnedLane && (
        <div className="tl-pin" style={{ '--acc': PROVIDER_META[pinnedLane.provider].accent } as CSSProperties}>
          <div className="tl-pin-body">{detail(pinnedLane.name, pinnedLane)}</div>
          <button type="button" className="tl-pin-x" aria-label="Unpin" onClick={() => setPinned(null)}>
            ×
          </button>
        </div>
      )}
      <div className="tl-scroll" ref={setScroller}>
      <div className="tl" style={{ '--cols': axisDays, '--view': view } as CSSProperties}>
        <div className="tl-head">
          <div className="tl-left tl-title">Limit</div>
          <div className="tl-days">
            {days.map((d, i) => {
              const dt = new Date(d)
              const month = dt.toLocaleDateString(undefined, { month: 'short' })
              // Wide columns spell out the date; narrow ones keep the day number and mark each month start.
              const roomy = view <= 10
              const top = roomy
                ? dt.toLocaleDateString(undefined, { weekday: 'short' })
                : i === 0 || dt.getDate() === 1
                  ? month
                  : dt.toLocaleDateString(undefined, { weekday: 'narrow' })
              return (
                <div key={d} className={`${d === today ? 'on' : ''}${!roomy && (i === 0 || dt.getDate() === 1) ? ' mo' : ''}`}>
                  <span>{top}</span>
                  <b>{roomy ? shortDate(d) : dt.getDate()}</b>
                </div>
              )
            })}
          </div>
        </div>

        {groups.map((g) => (
          <section key={g.provider} className="tl-group">
            {g.lanes.map((l) => {
              const used = Math.max(0, Math.min(100, l.window.usedPercent))
              const tone = remainingTone(remainingPercent(l.window))
              const fc = forecastOf(l.window, now)
              const runOut = fc && fc.runOutAt !== null && fc.runOutAt > now && fc.elapsed >= 0.05 ? fc.runOutAt : null
              const cur = { left: pct(l.startsAt), right: pct(l.resetsAt) }
              const clipped = l.startsAt < axisStart
              const elapsed = Math.max(0, Math.min(1, (nowPct - cur.left) / Math.max(0.01, cur.right - cur.left)))
              const info = detail(g.name, l)
              const label = `resets ${weekdayTime(l.resetsAt, now)}`
              return (
                <div key={l.key} className="tl-row" style={{ '--acc': PROVIDER_META[g.provider].accent } as CSSProperties}>
                  <div className="tl-left tl-limit" onMouseEnter={(e) => tip.show(e, info)} onMouseLeave={tip.hide}>
                    <ProviderLogo id={g.provider} size={18} />
                    <span className="tl-who">
                      <span className="tl-name" title={`${g.name} ${l.window.label}`}>
                        {l.window.label}
                      </span>
                      <small>
                        {g.name}
                        {g.plan ? ` · ${g.plan}` : ''}
                      </small>
                    </span>
                    <span className="tl-pct">{Math.round(used)}%</span>
                  </div>
                  <div className="tl-lane">
                    <i className="tl-past" style={{ width: `${nowPct}%` }} />
                    <i className="tl-today" style={{ left: `${pct(today)}%` }} />
                    <div
                      className={`tl-block tl-cur${pinned === l.key ? ' pinned' : ''}${clipped ? ' clip-l' : ''}`}
                      style={{ left: `${cur.left}%`, width: `${Math.max(0.6, cur.right - cur.left)}%` } as CSSProperties}
                      onMouseEnter={(e) => tip.show(e, info)}
                      onMouseLeave={tip.hide}
                      onClick={() => setPinned(pinned === l.key ? null : l.key)}
                    >
                      <i
                        className="tl-elapsed"
                        style={{ width: `${elapsed * 100}%` }}
                        onMouseEnter={(e) => {
                          e.stopPropagation()
                          tip.show(e, <><b>Time gone</b><span>{Math.round(elapsed * 100)}% of this window · {span(Math.max(0, now - l.startsAt))} elapsed</span><span>Started {weekdayTime(l.startsAt, now)}</span></>)
                        }}
                      />
                      <i
                        className={`tl-fill tl-tone-${tone}`}
                        style={{ width: `${used}%` }}
                        onMouseEnter={(e) => {
                          e.stopPropagation()
                          tip.show(e, <><b>Used</b><span>{Math.round(used)}% of the limit · {Math.round(100 - used)}% left</span></>)
                        }}
                      />
                    </div>
                    {runOut !== null && pct(runOut) < 100 && pct(l.resetsAt) - pct(runOut) > 0.4 && (
                      <i
                        className="tl-lock"
                        style={{ left: `${pct(runOut)}%`, width: `${pct(l.resetsAt) - pct(runOut)}%` }}
                        onMouseEnter={(e) => tip.show(e, <><b>Locked out</b><span>At this pace you run out {weekdayTime(runOut, now)}</span><span>and wait {span(Math.max(0, l.resetsAt - runOut))} for the reset</span></>)}
                        onMouseLeave={tip.hide}
                      />
                    )}
                    {pct(l.resetsAt) < 100 && (
                      <i
                        className="tl-next"
                        onMouseEnter={(e) => tip.show(e, <><b>Next window</b><span>{weekdayTime(l.resetsAt, now)} → {weekdayTime(l.resetsAt + l.length, now)}</span><span>Starts fresh at 0% used</span></>)}
                        onMouseLeave={tip.hide}
                        style={{ left: `${pct(l.resetsAt)}%`, width: `${Math.min(100, pct(l.resetsAt + l.length)) - pct(l.resetsAt)}%` }}
                      />
                    )}
                    <div className="tl-label" style={{ left: `${nowPct + 0.8}%` }}>
                      {label}
                      {runOut !== null && <span className="tl-warn"> · out {weekdayTime(runOut, now)}</span>}
                    </div>
                    <i
                      className="tl-now"
                      style={{ left: `${nowPct}%` }}
                      onMouseEnter={(e) => tip.show(e, <><b>Now</b><span>{weekdayTime(now, now)}</span></>)}
                      onMouseLeave={tip.hide}
                    />
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </div>
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
