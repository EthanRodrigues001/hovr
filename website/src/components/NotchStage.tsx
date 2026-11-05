'use client'

import { Pause, Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Notch } from '@/hovr/src/components/Notch'
import { useStore } from '@/hovr/src/store/appStore'

const W = 1080
const H = 770

interface Phase {
  label: string
  note: string
  ms: number
  apply: () => void
}

const PHASES: Phase[] = [
  { label: 'Pill', note: 'Collapsed, it shows what is left on each tool.', ms: 3200, apply: () => useStore.setState({ open: false, view: 'usage' }) },
  { label: 'Usage', note: 'Hover it: every limit, with the pace marker and reset time.', ms: 5200, apply: () => useStore.setState({ open: true, view: 'usage' }) },
  { label: 'Forecast', note: 'Which limits run out before they reset, and when.', ms: 5200, apply: () => useStore.setState({ open: true, view: 'analytics', analyticsTab: 'forecast' }) },
  { label: 'Spend', note: 'Tokens and estimated cost, per day and per model.', ms: 5200, apply: () => useStore.setState({ open: true, view: 'analytics', analyticsTab: 'spend' }) },
  { label: 'Timeline', note: 'Every limit window on one calendar.', ms: 5200, apply: () => useStore.setState({ open: true, view: 'analytics', analyticsTab: 'timeline' }) }
]

/**
 * The real HOVR notch on sample data, inside a mock desktop. It plays through five phases on its own
 * (pill, usage, forecast, spend, timeline); click a phase to jump to it, or hover the pill to use it like the app.
 */
export function NotchStage() {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [phase, setPhase] = useState(0)
  const [auto, setAuto] = useState(true)
  const dwell = useRef<number | undefined>(undefined)
  const leave = useRef<number | undefined>(undefined)

  useEffect(() => {
    void useStore.getState().hydrate()
  }, [])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const fit = () => setScale(Math.min(1, el.clientWidth / W))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Apply the current phase and, while auto-playing, advance when its time is up.
  useEffect(() => {
    PHASES[phase].apply()
    if (!auto) return
    const t = window.setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase].ms)
    return () => window.clearTimeout(t)
  }, [phase, auto])

  const jump = (i: number) => {
    setAuto(false)
    setPhase(i)
  }

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const rect = canvas.current?.querySelector<HTMLElement>('.notch')?.getBoundingClientRect()
      if (!rect) return
      const { open, setOpen } = useStore.getState()
      const padX = 18
      const inside = e.clientX >= rect.left - padX && e.clientX <= rect.right + padX && e.clientY <= rect.bottom + 14
      if (!open) {
        if (inside && e.clientY <= rect.bottom + 4) {
          if (dwell.current === undefined)
            dwell.current = window.setTimeout(() => {
              dwell.current = undefined
              setAuto(false)
              setOpen(true)
            }, 160)
        } else {
          window.clearTimeout(dwell.current)
          dwell.current = undefined
        }
      } else if (!auto) {
        if (inside) {
          window.clearTimeout(leave.current)
          leave.current = undefined
        } else if (leave.current === undefined) {
          leave.current = window.setTimeout(() => {
            leave.current = undefined
            useStore.getState().setOpen(false)
          }, 600)
        }
      }
    },
    [auto]
  )

  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <div
        ref={wrap}
        onPointerMove={onMove}
        className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[#0a0a0b]"
        style={{ height: H * scale }}
      >
        <div className="hovr-stage absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }} ref={canvas}>
          <Notch />
        </div>
      </div>

      {/* phase bar */}
      <div className="mt-4 flex items-stretch gap-2">
        <button
          onClick={() => setAuto((a) => !a)}
          aria-label={auto ? 'Pause the tour' : 'Play the tour'}
          className="flex w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {auto ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <div className="grid min-w-0 flex-1 grid-cols-5 gap-2">
          {PHASES.map((p, i) => {
            const active = i === phase
            return (
              <button
                key={p.label}
                onClick={() => jump(i)}
                className={`relative overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition-colors ${active ? 'border-white/25 bg-white/[0.08] text-white' : 'border-white/8 bg-white/[0.025] text-white/50 hover:bg-white/[0.06] hover:text-white/80'}`}
              >
                <span className="block text-[13px] font-medium">{p.label}</span>
                {active && auto && (
                  <span key={`${phase}-${auto}`} className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-white" style={{ animation: `phase ${p.ms}ms linear forwards` }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-[13px] text-white/45">
        {PHASES[phase].note} <span className="text-white/30">Live demo, sample data.</span>
      </p>
    </div>
  )
}
