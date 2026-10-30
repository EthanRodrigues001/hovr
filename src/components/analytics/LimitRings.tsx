/**
 * Concentric limit rings: one ring per limit window, full circle = the window from
 * its start to its reset. Solid arc = used so far, hatched arc = extra use projected
 * by reset at the current pace, white tick = now, red tick = where it runs out.
 * Names sit left of the 12 o'clock start line; click one to select it.
 */
import { useState } from 'react'
import { useHeatTip } from './HeatTip'
import type { Forecast } from '../../../shared/forecast'

export interface RingItem {
  key: string
  name: string
  /** One line shown in the centre while hovered, e.g. "Runs out Sat 02:16". */
  summary: string
  accent: string
  forecast: Forecast
}

const SIZE = 280
const C = SIZE / 2
const R0 = 120
const STEP = 13
const STROKE = 9
const MAX_RINGS = 7
/** Degrees a full window spans; the rest of the circle is left clear for the labels. */
const SWEEP = 300

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
  const [hover, setHover] = useState<string | null>(null)
  const tip = useHeatTip()
  const hovered = shown.find((i) => i.key === hover)
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
        const projected = Math.min(100, f.projectedAtReset ?? f.usedNow)
        const [nx1, ny1] = polar(r - STROKE / 2 - 2, f.elapsed * SWEEP)
        const [nx2, ny2] = polar(r + STROKE / 2 + 2, f.elapsed * SWEEP)
        return (
          <g key={item.key} className={`ring-g ${on ? 'on' : ''}`} onClick={() => onSelect(item.key)} onMouseEnter={(e) => {
              setHover(item.key)
              tip.show(
                e,
                <>
                  <b>{item.name}</b>
                  <span>{Math.round(f.usedNow)}% used · {item.summary}</span>
                </>
              )
            }}
            onMouseLeave={() => {
              setHover(null)
              tip.hide()
            }}
          >
            <path d={arc(r, 0, 100)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
            {projected > f.usedNow && (
              <path d={arc(r, f.usedNow, projected)} fill="none" stroke={item.accent} strokeOpacity={on ? 0.75 : 0.4} strokeWidth={STROKE} strokeDasharray="1.6 2.6" />
            )}
            <path d={arc(r, 0, f.usedNow)} fill="none" stroke={item.accent} strokeOpacity={on ? 1 : 0.55} strokeWidth={STROKE} strokeLinecap="butt" />
            {f.runOutAt !== null && (() => {
              const [x1, y1] = polar(r - STROKE / 2 - 2, SWEEP)
              const [x2, y2] = polar(r + STROKE / 2 + 2, SWEEP)
              return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f87171" strokeWidth={2} />
            })()}
            <line x1={nx1} y1={ny1} x2={nx2} y2={ny2} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
            <text x={C - 6} y={C - r + 3.5} textAnchor="end" className="ring-name">
              {item.name}
            </text>
            <rect x={C - 120} y={C - r - STROKE / 2} width={120} height={STROKE + 2} fill="transparent" />
          </g>
        )
      })}
      <line x1={C} y1={C - R0 - 10} x2={C} y2={C - R0 + (shown.length - 1) * STEP + 8} stroke="rgba(255,255,255,0.5)" strokeWidth={1.4} />
      <text x={C} y={C + 8} textAnchor="middle" className="ring-center-top">
        {hovered ? `${Math.round(hovered.forecast.usedNow)}% used` : center.top}
      </text>
      <text x={C} y={C + 26} textAnchor="middle" className="ring-center-bottom">
        {hovered ? hovered.summary : center.bottom}
      </text>
    </svg>
    {tip.node}
    </div>
  )
}
