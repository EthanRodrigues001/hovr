'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const AUTO_MS = 6500

const ITEMS = [
  {
    title: 'Pace, not just a number',
    text: 'A white marker on each bar shows where an even spend would be right now, so you see you are burning too fast while there is still time to slow down.',
    src: '/ui/f-pace.webp',
    w: 964,
    h: 640,
    alt: 'HOVR usage card: Claude Session 27% left with a pace marker and a warning that it runs out in 44 minutes, Weekly 70% left, Codex Monthly 48% left'
  },
  {
    title: 'Finds your tools by itself',
    text: 'It reads the sign-in files your tools already keep. No account, key or config to enter, and those files are never changed.',
    src: '/ui/f-tools.webp',
    w: 1020,
    h: 680,
    alt: 'HOVR Providers settings listing Claude Code, Codex and Antigravity as connected'
  },
  {
    title: 'A pill that stays out of the way',
    text: 'Collapsed, it shows what is left on each tool as a small ring, and it hides over fullscreen apps.',
    src: '/ui/f-pill.webp',
    w: 960,
    h: 640,
    alt: 'The collapsed HOVR notch showing 27% for Claude, 48% for Codex and 100% for Antigravity'
  },
  {
    title: 'Forecast',
    text: 'Which limits will run out before they reset, when, and how long they stay locked.',
    src: '/ui/f-forecast.webp',
    w: 1560,
    h: 960,
    alt: 'HOVR Forecast: two limits run out before reset, Claude Session runs out Saturday 15:57'
  },
  {
    title: 'Spend',
    text: "Tokens and estimated API cost per day and per model, read from your tools' local session logs.",
    src: '/ui/f-spend.webp',
    w: 1560,
    h: 950,
    alt: 'HOVR Spend: $580.48 estimated over 30 days with a daily cost chart for Claude, Antigravity and Codex'
  },
  {
    title: 'Timeline',
    text: 'Every limit window on one calendar: the one that ended, the current one, and the next as a dashed bar.',
    src: '/ui/f-timeline.webp',
    w: 1560,
    h: 950,
    alt: 'HOVR Timeline: Claude, Codex and Antigravity limit windows on a two-week calendar'
  },
  {
    title: 'Alerts',
    text: 'A Windows notification when a limit is nearly used up or will run out early. Each one shows once per window.',
    src: '/ui/f-alerts.webp',
    w: 960,
    h: 640,
    alt: 'Two HOVR notifications: Claude Code session 27% left, and Codex monthly will run out early'
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
            <Image
              src={ITEMS[active].src}
              width={ITEMS[active].w}
              height={ITEMS[active].h}
              alt={ITEMS[active].alt}
              sizes="(min-width: 1080px) 640px, 100vw"
              priority={active === 0}
              className="size-full object-cover object-top"
            />
          </motion.div>
        </AnimatePresence>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(360px_circle_at_var(--mx)_var(--my),rgba(255,255,255,0.06),transparent_70%)]" />
      </div>
    </div>
  )
}
