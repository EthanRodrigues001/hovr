/**
 * One usage window: label, percent left, a bar with a pace tick, reset countdown.
 *
 * The bar shows what is LEFT. The tick marks where an even spend would sit right
 * now, so a fill left of the tick means you are burning faster than the window
 * allows ("ahead of pace").
 */
import type { UsageWindow } from '../../shared/usage'
import { formatResetsIn, paceOf, paceRemainingPercent, remainingPercent } from '../../shared/usageMath'
import { remainingTone } from '../lib/providers'

const PACE_TEXT = { ahead: 'Ahead of pace', on: 'On pace', under: 'Under pace' } as const

export function WindowRow({ window, now }: { window: UsageWindow; now: number }) {
  const remaining = remainingPercent(window)
  const tone = remainingTone(remaining)
  const tick = paceRemainingPercent(window, now)
  const pace = paceOf(window, now)
  const resets = formatResetsIn(window, now)

  return (
    <div className="wrow">
      <div className="wrow-top">
        <span className="wrow-label">{window.label}</span>
        <span className={`wrow-pct tone-${tone}`}>{remaining}% left</span>
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-label={window.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={remaining}
      >
        <div className={`bar-fill tone-${tone}`} style={{ width: `${remaining}%` }} />
        {tick !== null && <div className="bar-tick" style={{ left: `${tick}%` }} title="Even-spend position" />}
      </div>
      {(resets || pace) && (
        <div className="wrow-bottom">
          <span>{resets ?? ''}</span>
          {pace && <span className={`pace pace-${pace}`}>{PACE_TEXT[pace]}</span>}
        </div>
      )}
    </div>
  )
}
