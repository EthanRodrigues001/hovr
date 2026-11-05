/**
 * Concentric limit rings: one ring per limit window, full circle = the window from
 * its start to its reset. Solid arc = used so far, hatched arc = extra use projected
 * by reset at the current pace, white tick = now, red tick = where it runs out.
 * Names sit left of the 12 o'clock start line; click one to select it.
 */
import { useHeatTip } from './HeatTip'
import type { Forecast } from '../../../shared/forecast'

export interface RingItem {
  key: string
  name: string
  /** Untruncated name for the tooltip. */
  fullName: string
  /** One line shown in the centre while hovered, e.g. "Runs out Sat 02:16". */
  summary: string
  /** Label / value pairs for the hover tooltip. */
  rows: Array<[string, string]>
  accent: string
  forecast: Forecast
}

const SIZE = 300
const C = SIZE / 2
const R0 = 140
const STEP = 15
const STROKE = 10
const MAX_RINGS = 7
/** Degrees a full window spans. The quarter left of 12 o'clock stays clear so the labels never cross an arc. */
const SWEEP = 270
/** Smallest arc drawn for a non-zero value, as a % of the window, so tiny usage is still visible. */
const MIN_VISIBLE = 4

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)]
}

function arc(r: number, fromPct: number, toPct: number): string {
  const from = (fromPct / 100) * SWEEP
  const to = Math.min(SWEEP, (toPct / 100) * SWEEP)
  if (to - from < 0.2) return ''
  const [x1, y1] = polar(r, from)
  const [x2, y2] = polar(r, to)
  return `M${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

export function LimitRings({
  items,
  selected,
  onSelect,
  center
}: {
  items: RingItem[]
  selected: string | undefined
  onSelect: (key: string) => void
  center: { top: string; bottom: string }
}) {
  const shown = items.slice(0, MAX_RINGS)
  const tip = useHeatTip()
  return (
    <div className="hm-wrap rings-wrap" ref={tip.ref}>
    <svg className="rings" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Limit rings">
      <defs>
        <pattern id="ring-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="1.6" height="4" fill="#fff" />
        </pattern>
      </defs>
      {shown.map((item, i) => {
        const r = R0 - i * STEP
        const f = item.forecast
        const on = item.key === selected
        const used = f.usedNow > 0 ? Math.max(f.usedNow, MIN_VISIBLE) : 0
        const projected = Math.min(100, f.projectedAtReset ?? f.usedNow)
        const [nx1, ny1] = polar(r - STROKE / 2 - 2, f.elapsed * SWEEP)
        const [nx2, ny2] = polar(r + STROKE / 2 + 2, f.elapsed * SWEEP)
        return (
          <g key={item.key} className={`ring-g ${on ? 'on' : ''}`} onClick={() => onSelect(item.key)} onMouseMove={(e) => {
              tip.follow(
                e,
                <>
                  <div className="ht-title">
                    <i style={{ background: item.accent }} />
                    {item.fullName}
                  </div>
                  {item.rows.map(([k, v]) => (
                    <div key={k} className="ht-row">
                      <span>{k}</span>
                      <b>{v}</b>
                    </div>
                  ))}
                  <div className={`ht-verdict ${f.runOutAt !== null ? 'bad' : ''}`}>{item.summary}</div>
                </>
              )
            }}
            onMouseLeave={() => {
              tip.hide()
            }}
          >
            <path d={arc(r, 0, 100)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
            {projected > used && (
              <path d={arc(r, used, projected)} fill="none" stroke={item.accent} strokeOpacity={on ? 0.75 : 0.4} strokeWidth={STROKE} strokeDasharray="1.6 2.6" />
            )}
            <path d={arc(r, 0, used)} fill="none" stroke={item.accent} strokeOpacity={on ? 1 : 0.55} strokeWidth={STROKE} strokeLinecap="round" />
            {f.runOutAt !== null && (() => {
              const [x1, y1] = polar(r - STROKE / 2 - 2, SWEEP)
              const [x2, y2] = polar(r + STROKE / 2 + 2, SWEEP)
              return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f87171" strokeWidth={2} />
            })()}
            <line x1={nx1} y1={ny1} x2={nx2} y2={ny2} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
            <text x={C - 8} y={C - r + 4} textAnchor="end" className="ring-name">
              {item.name}
            </text>
            <rect x={C - 160} y={C - r - STROKE / 2} width={160} height={STROKE + 2} fill="transparent" />
          </g>
        )
      })}
      <line x1={C} y1={C - R0 - 10} x2={C} y2={C - R0 + (shown.length - 1) * STEP + 8} stroke="rgba(255,255,255,0.5)" strokeWidth={1.4} />
      <text x={C} y={C + 8} textAnchor="middle" className="ring-center-top">
        {center.top}
      </text>
      <text x={C} y={C + 26} textAnchor="middle" className="ring-center-bottom">
        {center.bottom}
      </text>
    </svg>
    {tip.node}
    </div>
  )
}
