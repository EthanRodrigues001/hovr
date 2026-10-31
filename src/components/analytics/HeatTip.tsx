import { type MouseEvent, type ReactNode, useRef, useState } from 'react'

/** A small floating tooltip for plain-DOM charts (heatmaps), positioned over the hovered cell. */
export function useHeatTip() {
  const ref = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ x: number; y: number; text: ReactNode; follow?: boolean; flip?: boolean } | null>(null)
  const show = (e: MouseEvent<Element>, text: ReactNode) => {
    const wrap = ref.current?.getBoundingClientRect()
    if (!wrap) return
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ x: r.left - wrap.left + r.width / 2, y: r.top - wrap.top, text })
  }
  /** Sits beside the pointer instead of above the element, flipping left near the right edge. */
  const follow = (e: MouseEvent<Element>, text: ReactNode) => {
    const wrap = ref.current?.getBoundingClientRect()
    if (!wrap) return
    const x = e.clientX - wrap.left
    setTip({ x, y: e.clientY - wrap.top, text, follow: true, flip: x > wrap.width * 0.5 })
  }
  const hide = () => setTip(null)
  const node = tip ? (
    <div className={`heat-tip ${tip.follow ? (tip.flip ? 'follow flip' : 'follow') : ''}`} style={{ left: tip.x, top: tip.y }}>
      {tip.text}
    </div>
  ) : null
  return { ref, show, follow, hide, node }
}
