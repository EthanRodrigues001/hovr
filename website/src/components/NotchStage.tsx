'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Notch } from '@/hovr/src/components/Notch'
import { useStore } from '@/hovr/src/store/appStore'

const W = 1080
const H = 760
const TOUR: Array<() => void> = [
  () => useStore.setState({ open: true, view: 'usage' }),
  () => useStore.setState({ open: true, view: 'analytics', analyticsTab: 'forecast' }),
  () => useStore.setState({ open: true, view: 'analytics', analyticsTab: 'spend' }),
  () => useStore.setState({ open: true, view: 'analytics', analyticsTab: 'timeline' }),
  () => useStore.setState({ open: false, view: 'usage' })
]
const TOUR_MS = [4200, 4800, 4800, 4800, 2600]

/**
 * The real HOVR notch running on sample data inside a mock desktop. It plays a short tour,
 * stops the moment you touch it, then behaves like the app: hover the pill to open, leave to close.
 */
export function NotchStage() {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const touched = useRef(false)
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

  // Guided tour until the visitor interacts.
  useEffect(() => {
    let i = 0
    let t: number | undefined
    const step = () => {
      if (touched.current) return
      TOUR[i]()
      const wait = TOUR_MS[i]
      i = (i + 1) % TOUR.length
      t = window.setTimeout(step, wait)
    }
    t = window.setTimeout(step, 1200)
    return () => window.clearTimeout(t)
  }, [])

  const onMove = useCallback((e: React.PointerEvent) => {
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
            touched.current = true
            setOpen(true)
          }, 160)
      } else {
        window.clearTimeout(dwell.current)
        dwell.current = undefined
      }
    } else if (touched.current) {
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
  }, [])

  return (
    <div
      ref={wrap}
      onPointerMove={onMove}
      onPointerDown={() => {
        touched.current = true
      }}
      className="relative mx-auto w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0b] shadow-[0_40px_120px_-40px_rgba(255,255,255,0.1)]"
      style={{ height: H * scale }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 110%, rgba(120,120,140,0.22), transparent 70%), radial-gradient(ellipse 50% 40% at 15% 90%, rgba(217,119,87,0.10), transparent 70%), radial-gradient(ellipse 50% 40% at 85% 85%, rgba(162,89,255,0.10), transparent 70%), #0a0a0b'
        }}
      />
      <div className="hovr-stage absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }} ref={canvas}>
        <Notch />
      </div>
      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[12px] text-white/35">
        Live demo with sample data. Hover the pill to open it.
      </p>
    </div>
  )
}
