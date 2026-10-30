import { type MouseEvent, type ReactNode, useRef, useState } from 'react'

/** A small floating tooltip for plain-DOM charts (heatmaps), positioned over the hovered cell. */
export function useHeatTip() {
  const ref = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ x: number; y: number; text: ReactNode } | null>(null)
  const show = (e: MouseEvent<Element>, text: ReactNode) => {
    const wrap = ref.current?.getBoundingClientRect()
    if (!wrap) return
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ x: r.left - wrap.left + r.width / 2, y: r.top - wrap.top, text })
  }
  const hide = () => setTip(null)
  const node = tip ? (
    <div className="heat-tip" style={{ left: tip.x, top: tip.y }}>
      {tip.text}
    </div>
  ) : null
  return { ref, show, hide, node }
}
