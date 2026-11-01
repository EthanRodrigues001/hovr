/**
 * One usage window: label and a large "% left" on the left, a wide bar on the right.
 *
 * The filled part of the bar is what is LEFT; the hatched part is what has been used.
 * The white tick marks where an even spend would sit right now, so a fill that ends
 * before the tick means you are burning faster than the window allows. The reset
 * countdown sits inside the bar at the right end.
 */
import { AlertTriangle, Gauge, RotateCw, TrendingDown, TrendingUp } from 'lucide-react'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import type { ProviderId, UsageWindow } from '../../shared/usage'
import { forecastOf } from '../../shared/forecast'
import { span, weekdayTime } from '../lib/format'
import { formatResetsIn, paceOf, paceRemainingPercent, remainingPercent } from '../../shared/usageMath'
import { PROVIDER_META, remainingTone } from '../lib/providers'
import { useFloatTip } from './analytics/HeatTip'

const PACE = {
  ahead: { Icon: TrendingUp, text: 'Ahead of pace, using faster than an even spend' },
  on: { Icon: Gauge, text: 'On pace' },
  under: { Icon: TrendingDown, text: 'Under pace, using slower than an even spend' }
} as const

export function WindowRow({ window, now, provider }: { window: UsageWindow; now: number; provider: ProviderId }) {
  const remaining = remainingPercent(window)
  const exact = 100 - Math.max(0, Math.min(100, window.usedPercent))
  const shown = exact > 95 && exact < 100 ? exact.toFixed(1).replace(/\.0$/, '') : String(remaining)
  const tone = remainingTone(remaining)
  const tick = paceRemainingPercent(window, now)
  const pace = paceOf(window, now)
  const resets = formatResetsIn(window, now)?.replace('resets in ', '') ?? null
  const fc = forecastOf(window, now)
  const runOut = fc && fc.runOutAt !== null && fc.runOutAt > now && fc.elapsed >= 0.05 ? fc.runOutAt : null
  const PaceIcon = pace ? PACE[pace].Icon : null
  const tip = useFloatTip()
  const used = Math.round(100 - exact)
  const on = (body: ReactNode) => ({ onMouseEnter: (e: MouseEvent<Element>) => tip.show(e, body), onMouseLeave: tip.hide })
  const style = { '--accent': PROVIDER_META[provider].accent } as CSSProperties

  return (
    <div className="wrow" style={style}>
      <div className="wrow-info">
        <div className="wrow-label" {...on(<b>{window.label}</b>)}>
          {window.label}
        </div>
        <div className="wrow-big">
          <span className="wrow-pct">{shown}%</span>
          <span className="wrow-left">left</span>
          {PaceIcon && pace && (
            <span className={`wrow-pace pace-${pace}`} {...on(<><b>Pace</b><span>{PACE[pace].text}</span></>)}>
              <PaceIcon size={14} />
            </span>
          )}
        </div>
        {runOut !== null && fc && (
          <div
            className="wrow-out"
            {...on(
              <>
                <b>Runs out early</b>
                <span>At this pace: {weekdayTime(runOut, now)}</span>
                <span>{span(fc.lockedMs)} before it resets</span>
              </>
            )}
          >
            <AlertTriangle size={11} />
            Out in {span(runOut - now)} at this pace
          </div>
        )}
      </div>
      <div
        className={`bar tone-bar-${tone}`}
        role="progressbar"
        aria-label={window.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={remaining}
        {...on(
          <>
            <b>{window.label}</b>
            <span>{shown}% left · {used}% used</span>
            {resets && <span>Resets in {resets}</span>}
          </>
        )}
      >
        <div className="bar-fill" style={{ width: `${exact}%` }} {...on(<><b>{shown}% left</b><span>The filled part is what remains</span></>)} />
        {tick !== null && <div className="bar-tick" style={{ left: `${tick}%` }} {...on(<><b>Even-spend position</b><span>Where you would be if you used it evenly. Fill ending before this means you are burning faster.</span></>)}><i /></div>}
        <div className="bar-chips">
          {resets && (
            <span className="bar-chip" {...on(<><b>Resets in {resets}</b><span>Usage returns to 0% then</span></>)}>
              <RotateCw size={10} />
              {resets}
            </span>
          )}
        </div>
      </div>
      {tip.node}
    </div>
  )
}
