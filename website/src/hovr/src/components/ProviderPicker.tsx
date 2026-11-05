import { useEffect, useRef, useState } from 'react'
import type { ProviderId } from '../../shared/usage'
import { ProviderLogo } from './ProviderLogo'

/** A checkbox dropdown: pick which providers the timeline shows. Closes on outside click or Escape. */
export function ProviderPicker({
  items,
  hidden,
  onToggle,
  allLabel = 'All providers'
}: {
  items: Array<{ id: ProviderId; name: string }>
  hidden: ReadonlySet<ProviderId>
  onToggle: (id: ProviderId) => void
  allLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  const shown = items.length - hidden.size
  return (
    <div className="dd" ref={ref}>
      <button type="button" className="dd-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="dd-stack">
          {items
            .filter((it) => !hidden.has(it.id))
            .slice(0, 4)
            .map((it) => (
              <span key={it.id}>
                <ProviderLogo id={it.id} size={14} />
              </span>
            ))}
        </span>
        {shown === items.length ? allLabel : `${shown} of ${items.length}`}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="dd-menu" role="menu">
          <div className="dd-label">Show providers</div>
          {items.map((it) => {
            const on = !hidden.has(it.id)
            return (
              <button key={it.id} type="button" role="menuitemcheckbox" aria-checked={on} className="dd-item" onClick={() => onToggle(it.id)}>
                <span className={`dd-check${on ? ' on' : ''}`}>
                  {on && (
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                      <path d="M2 5.2 4.1 7.2 8 2.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <ProviderLogo id={it.id} size={16} />
                {it.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
