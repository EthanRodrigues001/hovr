/**
 * A solid bar split into rounded segments in proportion to their value, with a legend of
 * "label count" underneath ("Done 8, Due soon 4, ..."). Zero-value segments get no slice
 * but keep their legend entry. Hover a segment for its name and share.
 */
import { useHeatTip } from './HeatTip'

export interface BarSegment {
  label: string
  value: number
  color: string
  /** Text shown after the label in the legend; defaults to the value. */
  display?: string
}

export function SegmentBar({ segments, hideEmpty = false }: { segments: BarSegment[]; hideEmpty?: boolean }) {
  const tip = useHeatTip()
  const live = segments.filter((s) => s.value > 0)
  const total = live.reduce((a, s) => a + s.value, 0)
  const legend = hideEmpty ? live : segments
  return (
    <div className="segbar hm-wrap" ref={tip.ref}>
      <div className="segbar-track" role="img" aria-label={segments.map((s) => `${s.display ?? s.value} ${s.label}`).join(', ')}>
        {live.map((s) => (
          <i
            key={s.label}
            style={{ flexGrow: s.value, background: s.color }}
            onMouseEnter={(e) =>
              tip.show(
                e,
                <>
                  <b>{s.label}</b>
                  <span>
                    {s.display ?? s.value} · {Math.round((s.value / total) * 100)}%
                  </span>
                </>
              )
            }
            onMouseLeave={tip.hide}
          />
        ))}
      </div>
      <div className="segbar-legend">
        {legend.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color }} />
            {s.label}
            <b>{s.display ?? s.value}</b>
          </span>
        ))}
      </div>
      {tip.node}
    </div>
  )
}
