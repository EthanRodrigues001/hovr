/**
 * A scroll container with no scrollbar. Content fades out at an edge that has more to scroll,
 * and a "Scroll to end" pill at the bottom says so (click it to jump there).
 */
import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  /** Class for the scrolling element (padding, flex sizing, …). */
  className?: string
  /** Extra class for the wrapper. */
  wrapClass?: string
  children: ReactNode
}

export function ScrollArea({ className = '', wrapClass = '', children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ top: false, bottom: false })
  const [rail, setRail] = useState({ top: 0, height: 0, active: false })
  const idle = useRef<number | undefined>(undefined)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const top = el.scrollTop > 4
    const bottom = el.scrollHeight - el.clientHeight - el.scrollTop > 4
    setEdges((e) => (e.top === top && e.bottom === bottom ? e : { top, bottom }))
    const ratio = el.clientHeight / el.scrollHeight
    setRail((r) => ({ top: (el.scrollTop / el.scrollHeight) * 100, height: ratio * 100, active: r.active }))
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    const watch = () => {
      ro.disconnect()
      ro.observe(el)
      for (const child of Array.from(el.children)) ro.observe(child)
      measure()
    }
    watch()
    const mo = new MutationObserver(watch)
    mo.observe(el, { childList: true })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [measure])

  return (
    <div className={`sa ${wrapClass}`}>
      <div
        ref={ref}
        className={`sa-scroller ${className}`}
        onScroll={() => {
          measure()
          setRail((r) => ({ ...r, active: true }))
          window.clearTimeout(idle.current)
          idle.current = window.setTimeout(() => setRail((r) => ({ ...r, active: false })), 900)
        }}
        style={{ '--fade-top': edges.top ? '34px' : '0px', '--fade-bottom': edges.bottom ? '64px' : '0px' } as React.CSSProperties}
      >
        {children}
      </div>
      {rail.height < 99.5 && (
        <div className={`sa-rail ${rail.active ? 'on' : ''}`} aria-hidden>
          <div className="sa-thumb" style={{ top: `${rail.top}%`, height: `${rail.height}%` }} />
        </div>
      )}
      {edges.bottom && (
        <button
          className="sa-more"
          aria-label="Scroll to end"
          onClick={() => ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })}
        >
          <ChevronDown size={14} strokeWidth={2} />
          Scroll to end
        </button>
      )}
    </div>
  )
}
