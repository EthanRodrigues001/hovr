/**
 * One usage window: label and a large "% left" on the left, a wide bar on the right.
 *
 * The filled part of the bar is what is LEFT; the hatched part is what has been used.
 * The white tick marks where an even spend would sit right now, so a fill that ends
 * before the tick means you are burning faster than the window allows. The reset
 * countdown sits inside the bar at the right end.
 */
import { Gauge, RotateCw, TrendingDown, TrendingUp } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { ProviderId, UsageWindow } from '../../shared/usage'
import { formatResetsIn, paceOf, paceRemainingPercent, remainingPercent } from '../../shared/usageMath'
import { PROVIDER_META, remainingTone } from '../lib/providers'

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
  const PaceIcon = pace ? PACE[pace].Icon : null
  const style = { '--accent': PROVIDER_META[provider].accent } as CSSProperties

  return (
    <div className="wrow" style={style}>
      <div className="wrow-info">
        <div className="wrow-label" title={window.label}>
          {window.label}
        </div>
        <div className="wrow-big">
          <span className="wrow-pct">{shown}%</span>
          <span className="wrow-left">left</span>
          {PaceIcon && pace && (
            <span className={`wrow-pace pace-${pace}`} title={PACE[pace].text}>
              <PaceIcon size={14} />
            </span>
          )}
        </div>
      </div>
      <div
        className={`bar tone-bar-${tone}`}
        role="progressbar"
        aria-label={window.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={remaining}
      >
        <div className="bar-fill" style={{ width: `${exact}%` }} />
        {tick !== null && <div className="bar-tick" style={{ left: `${tick}%` }} title="Even-spend position" />}
        {resets && (
          <span className="bar-chip">
            <RotateCw size={10} />
            {resets}
          </span>
        )}
      </div>
    </div>
  )
}
