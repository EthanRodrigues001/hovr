'use client'

import { AnimatePresence, motion } from 'motion/react'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

const Scaled = dynamic(() => import('./FeatureViews').then((m) => m.Scaled), { ssr: false })

const AUTO_MS = 6500

const ITEMS = [
  {
    title: 'Pace, not just a number',
    text: 'A white marker on each bar shows where an even spend would be right now, so you see you are burning too fast while there is still time to slow down.'
  },
  {
    title: 'Finds your tools by itself',
    text: 'It reads the sign-in files your tools already keep. No account, key or config to enter, and those files are never changed.'
  },
  {
    title: 'A pill that stays out of the way',
    text: 'Collapsed, it shows what is left on each tool as a small ring, and it hides over fullscreen apps.'
  },
  {
    title: 'Forecast',
    text: 'Which limits will run out before they reset, when, and how long they stay locked.'
  },
  {
    title: 'Spend',
    text: "Tokens and estimated API cost per day and per model, read from your tools' local session logs."
  },
  {
    title: 'Timeline',
    text: 'Every limit window on one calendar: the one that ended, the current one, and the next as a dashed bar.'
  },
  {
    title: 'Alerts',
    text: 'A Windows notification when a limit is nearly used up or will run out early. Each one shows once per window.',
  }
] as const

/** Feature list on the left, the matching screen of the real app on the right. Auto-advances; hover or click to take over. */
export function Features() {
  const [active, setActive] = useState(0)
  const [hold, setHold] = useState(false)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hold) return
    const t = window.setTimeout(() => setActive((a) => (a + 1) % ITEMS.length), AUTO_MS)
    return () => window.clearTimeout(t)
  }, [active, hold])

  const onMove = (e: React.PointerEvent) => {
    const el = panel.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,4.4fr)_minmax(0,7.6fr)] lg:gap-10" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}>
      <ul className="flex flex-col">
        {ITEMS.map((item, i) => {
          const on = i === active
          return (
            <li key={item.title} className="relative border-b border-white/8 first:border-t">
              <button onClick={() => setActive(i)} onPointerEnter={() => setActive(i)} className="group flex w-full gap-3.5 py-3 text-left" aria-expanded={on}>
                <span className={`mt-[3px] w-5 shrink-0 text-[12px] tabular-nums transition-colors ${on ? 'text-white' : 'text-white/30 group-hover:text-white/60'}`}>{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[17px] font-semibold tracking-tight transition-colors ${on ? 'text-white' : 'text-white/45 group-hover:text-white/75'}`}>{item.title}</span>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.span
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="block overflow-hidden"
                      >
                        <span className="block pb-1 pt-1.5 text-[14px] leading-relaxed text-white/58">{item.text}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </button>
              {on && !hold && <span key={`bar-${active}`} className="absolute inset-x-0 bottom-[-1px] h-px origin-left bg-white" style={{ animation: `phase ${AUTO_MS}ms linear forwards` }} />}
            </li>
          )
        })}
      </ul>

      <div
        ref={panel}
        onPointerMove={onMove}
        className="relative aspect-[3/2] overflow-hidden rounded-[24px] border border-white/10 bg-[#080809]"
        style={{ ['--mx' as string]: '50%', ['--my' as string]: '30%' }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.025, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(6px)' }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Scaled index={active} />
          </motion.div>
        </AnimatePresence>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(360px_circle_at_var(--mx)_var(--my),rgba(255,255,255,0.06),transparent_70%)]" />
      </div>
    </div>
  )
}
