'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { DetectedRow, NotificationMock, PaceMock, PillMock } from './Mocks'

const AUTO_MS = 6500

function Shot({ src, w, h, alt }: { src: string; w: number; h: number; alt: string }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,1)]">
      <Image src={src} width={w} height={h} alt={alt} sizes="(min-width: 1080px) 640px, 100vw" className="h-auto w-full" />
    </div>
  )
}

const ITEMS = [
  {
    title: 'Pace, not just a number',
    text: 'A white marker on each bar shows where an even spend would be right now, so you see you are burning too fast while there is still time to slow down.',
    visual: (
      <div className="w-full max-w-[540px]">
        <PaceMock />
      </div>
    )
  },
  {
    title: 'Finds your tools by itself',
    text: 'It reads the sign-in files your tools already keep. No account, key or config to enter, and no sign-in files are ever changed.',
    visual: (
      <div className="flex h-[250px] w-full max-w-[440px] flex-col">
        <DetectedRow />
      </div>
    )
  },
  {
    title: 'A pill that stays out of the way',
    text: 'Collapsed, it shows what is left on each tool as a small ring, and it hides over fullscreen apps.',
    visual: (
      <div className="flex w-full max-w-[420px] flex-col">
        <PillMock />
      </div>
    )
  },
  {
    title: 'Forecast',
    text: 'Which limits will run out before they reset, when, and how long they stay locked.',
    visual: <Shot src="/ui/forecast-list.webp" w={1030} h={400} alt="HOVR Forecast: Claude Session runs out Saturday 15:57, Codex Monthly runs out Wednesday, Claude Weekly ends at about 87%" />
  },
  {
    title: 'Spend',
    text: "Tokens and estimated API cost per day and per model, read from your tools' local session logs.",
    visual: <Shot src="/ui/spend.webp" w={1032} h={470} alt="HOVR Spend: daily cost chart for Claude, Antigravity and Codex over 30 days" />
  },
  {
    title: 'Timeline',
    text: 'Every limit window on one calendar: the one that ended, the current one, and the next as a dashed bar.',
    visual: <Shot src="/ui/timeline.webp" w={1560} h={600} alt="HOVR Timeline: Claude, Codex and Antigravity limit windows on a two-week calendar" />
  },
  {
    title: 'Alerts',
    text: 'A Windows notification when a limit is nearly used up or will run out early. Each one shows once per window.',
    visual: (
      <div className="w-full max-w-[420px] space-y-2.5">
        <NotificationMock />
        <div className="rounded-2xl border border-white/10 bg-[#202023] p-3.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
          <p className="text-[13.5px] font-semibold text-white">Codex monthly will run out early</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-white/60">At the current pace it runs out Wed Nov 11, 8 days before it resets.</p>
        </div>
      </div>
    )
  }
] as const

/** Feature list on the left, the matching piece of the real UI on the right. Auto-advances; hover or click to take over. */
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
    <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}>
      <ul className="flex flex-col">
        {ITEMS.map((item, i) => {
          const on = i === active
          return (
            <li key={item.title} className="relative border-b border-white/8 last:border-b-0">
              <button onClick={() => setActive(i)} onPointerEnter={() => setActive(i)} className="group flex w-full gap-4 py-4 text-left" aria-expanded={on}>
                <span className={`mt-1 w-6 shrink-0 text-[12px] tabular-nums transition-colors ${on ? 'text-white' : 'text-white/30 group-hover:text-white/60'}`}>{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[18px] font-semibold tracking-tight transition-colors ${on ? 'text-white' : 'text-white/45 group-hover:text-white/75'}`}>{item.title}</span>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.span
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="block overflow-hidden"
                      >
                        <span className="block pt-2 text-[14.5px] leading-relaxed text-white/58">{item.text}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </button>
              {on && !hold && (
                <span key={`bar-${active}`} className="absolute inset-x-0 bottom-[-1px] h-px origin-left bg-white" style={{ animation: `phase ${AUTO_MS}ms linear forwards` }} />
              )}
            </li>
          )
        })}
      </ul>

      <div
        ref={panel}
        onPointerMove={onMove}
        className="relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[#080809] p-6 sm:p-8 lg:min-h-[470px]"
        style={{ ['--mx' as string]: '50%', ['--my' as string]: '30%' }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_circle_at_var(--mx)_var(--my),rgba(255,255,255,0.07),transparent_70%)]" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 14, scale: 0.985, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, scale: 0.99, filter: 'blur(4px)' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex w-full justify-center"
          >
            {ITEMS[active].visual}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
