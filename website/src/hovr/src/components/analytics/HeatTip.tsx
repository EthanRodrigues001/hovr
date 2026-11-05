import { type MouseEvent, type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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

/** A tooltip portalled to <body> and clamped to the window, so scrollers and panel edges never cut it off. */
export function useFloatTip() {
  const ref = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ cx: number; top: number; bottom: number; text: ReactNode } | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const show = (e: MouseEvent<Element>, text: ReactNode) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPos(null)
    setTip({ cx: r.left + r.width / 2, top: r.top, bottom: r.bottom, text })
  }
  const hide = () => setTip(null)
  useLayoutEffect(() => {
    if (!tip || !box.current) return
    const w = box.current.offsetWidth
    const h = box.current.offsetHeight
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, tip.cx - w / 2))
    const above = tip.top - h - 8
    setPos({ left, top: above >= 8 ? above : tip.bottom + 8 })
  }, [tip])
  const node = tip
    ? createPortal(
        <div
          ref={box}
          className="heat-tip float"
          style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
        >
          {tip.text}
        </div>,
        document.body
      )
    : null
  return { ref, show, hide, node }
}
