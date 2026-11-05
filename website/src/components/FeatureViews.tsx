'use client'

import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ForecastTab } from '@/hovr/src/components/analytics/ForecastTab'
import { SpendTab } from '@/hovr/src/components/analytics/SpendTab'
import { TimelineTab } from '@/hovr/src/components/analytics/TimelineTab'
import { Logo } from '@/hovr/src/components/Logo'
import { ScrollArea } from '@/hovr/src/components/ScrollArea'
import { SettingsSheet } from '@/hovr/src/components/SettingsSheet'
import { UsageView } from '@/hovr/src/components/UsageView'
import { Segmented } from '@/hovr/src/components/ui'
import { edge } from '@/hovr/src/lib/edge'
import type { HistoryReport } from '@/hovr/shared/history'
import { useStore } from '@/hovr/src/store/appStore'
import { AlertShot, PillShot } from './ShotCards'

/** Every view is laid out at this size, then scaled to fit the panel. */
export const DESIGN = { w: 900, h: 600 }

type Tab = 'forecast' | 'spend' | 'timeline'
const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'forecast', label: 'Forecast' },
  { value: 'spend', label: 'Spend' },
  { value: 'timeline', label: 'Timeline' }
]
const RANGES = [7, 30, 90] as const
const noop = () => undefined

/** The app's own analytics header, static. */
function AnalyticsFrame({ tab, children }: { tab: Tab; children: React.ReactNode }) {
  return (
    <div className="layer-wrap">
      <div className="layer an">
        <header className="an-head">
          <span className="back-btn">
            <ArrowLeft size={14} />
            Usage
          </span>
          <h1 className="an-title">Analytics</h1>
          <Segmented<Tab> value={tab} onChange={noop} options={TABS} />
          <span className="spacer" />
          {tab === 'spend' && <Segmented<number> value={30} onChange={noop} options={RANGES.map((n) => ({ value: n, label: `${n}d` }))} />}
        </header>
        <ScrollArea className="an-scroll">{children}</ScrollArea>
      </div>
    </div>
  )
}

function Spend() {
  const [report, setReport] = useState<HistoryReport | null | 'failed'>(null)
  useEffect(() => {
    let off = false
    edge.getHistory(30).then((r) => !off && setReport(r)).catch(() => !off && setReport('failed'))
    return () => {
      off = true
    }
  }, [])
  return (
    <AnalyticsFrame tab="spend">
      <SpendTab report={report} days={30} />
    </AnalyticsFrame>
  )
}

function Usage() {
  return (
    <div className="layer-wrap">
      <div className="layer">
        <div className="nhead" style={{ height: 46 }}>
          <Logo size={15} />
          <span className="nhead-title">HOVR</span>
        </div>
        <ScrollArea className="nbody">
          <UsageView />
        </ScrollArea>
      </div>
    </div>
  )
}

export const VIEWS: Array<() => React.ReactNode> = [
  () => <Usage />,
  () => <SettingsSheet />,
  () => <PillShot />,
  () => (
    <AnalyticsFrame tab="forecast">
      <ForecastTab />
    </AnalyticsFrame>
  ),
  () => <Spend />,
  () => (
    <AnalyticsFrame tab="timeline">
      <TimelineTab />
    </AnalyticsFrame>
  ),
  () => <AlertShot />
]

/** Renders a view at DESIGN size, scaled to the width of its container. The app's own components, live. */
export function Scaled({ index }: { index: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const hydrated = useStore((s) => s.hydrated)

  useEffect(() => {
    if (!useStore.getState().hydrated) void useStore.getState().hydrate()
  }, [])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(el.clientWidth / DESIGN.w)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fixed = index === 2 || index === 6 // these two are drawn at 960x640
  const w = fixed ? 960 : DESIGN.w
  const h = fixed ? 640 : DESIGN.h

  return (
    <div ref={box} className="absolute inset-0">
      {hydrated && scale > 0 && (
        <div
          className="hovr-stage relative origin-top-left overflow-hidden bg-black"
          style={{ width: w, height: h, transform: `scale(${(box.current?.clientWidth ?? 0) / w})` }}
        >
          {VIEWS[index]()}
        </div>
      )}
    </div>
  )
}
