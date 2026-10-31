/**
 * A scroll container with no scrollbar. Content fades out at an edge that has more to scroll,
 * and a small chevron at the bottom says so (click it to page down).
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

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const top = el.scrollTop > 4
    const bottom = el.scrollHeight - el.clientHeight - el.scrollTop > 4
    setEdges((e) => (e.top === top && e.bottom === bottom ? e : { top, bottom }))
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
        onScroll={measure}
        style={{ '--fade-top': edges.top ? '28px' : '0px', '--fade-bottom': edges.bottom ? '52px' : '0px' } as React.CSSProperties}
      >
        {children}
      </div>
      {edges.bottom && (
        <button
          className="sa-more"
          aria-label="Scroll down"
          onClick={() => ref.current?.scrollBy({ top: ref.current.clientHeight * 0.8, behavior: 'smooth' })}
        >
          <ChevronDown size={14} />
        </button>
      )}
    </div>
  )
}
