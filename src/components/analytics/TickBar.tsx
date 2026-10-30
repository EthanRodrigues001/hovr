/**
 * A bar made of thin vertical ticks, split between categories in proportion to their
 * value, with a dotted-marker legend underneath ("38 Scheduled, 5 Active, ...").
 */
import { useHeatTip } from './HeatTip'

export interface TickSegment {
  label: string
  value: number
  color: string
  /** Text shown after the label in the legend; defaults to the value. */
  display?: string
}

export function TickBar({ segments, ticks = 64 }: { segments: TickSegment[]; ticks?: number }) {
  const live = segments.filter((s) => s.value > 0)
  const total = live.reduce((a, s) => a + s.value, 0)
  const tip = useHeatTip()
  const colors: Array<{ color: string; seg: TickSegment }> = []
  if (total > 0) {
    // Largest-remainder allocation so every non-empty segment gets at least one tick.
    const raw = live.map((s) => (s.value / total) * ticks)
    const counts = raw.map((r) => Math.max(1, Math.floor(r)))
    let diff = ticks - counts.reduce((a, b) => a + b, 0)
    const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac)
    for (let k = 0; diff !== 0 && k < 1000; k++) {
      const idx = order[k % order.length].i
      if (diff > 0) {
        counts[idx]++
        diff--
      } else if (counts[idx] > 1) {
        counts[idx]--
        diff++
      }
    }
    live.forEach((s, i) => {
      for (let n = 0; n < counts[i]; n++) colors.push({ color: s.color, seg: s })
    })
  }
  return (
    <div className="tickbar hm-wrap" ref={tip.ref}>
      <div className="tickbar-bars" role="img" aria-label={segments.map((s) => `${s.display ?? s.value} ${s.label}`).join(', ')}>
        {colors.map((c, i) => (
          <i
            key={i}
            style={{ background: c.color }}
            onMouseEnter={(e) =>
              tip.show(
                e,
                <>
                  <b>{c.seg.label}</b>
                  <span>{c.seg.display ?? c.seg.value}</span>
                </>
              )
            }
            onMouseLeave={tip.hide}
          />
        ))}
      </div>
      <div className="tickbar-legend">
        {segments.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color }} />
            {s.display ?? s.value} {s.label}
          </span>
        ))}
      </div>
      {tip.node}
    </div>
  )
}
