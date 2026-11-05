/**
 * Analytics modal: the notch grown into a dashboard. Three tabs:
 *  - Forecast: will each limit last until it resets, if the current pace holds
 *  - Spend: tokens and estimated API cost from local session logs
 *  - Activity: when you work (calendar + weekday/hour heatmaps)
 */
import { ArrowLeft, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { HistoryReport } from '../../../shared/history'
import { closeNotch } from '../../hooks/useNotchHover'
import { edge } from '../../lib/edge'
import { type AnalyticsTab, useStore } from '../../store/appStore'
import { ScrollArea } from '../ScrollArea'
import { Segmented } from '../ui'
import { ForecastTab } from './ForecastTab'
import { SpendTab } from './SpendTab'
import { TimelineTab } from './TimelineTab'

const TABS: ReadonlyArray<{ value: AnalyticsTab; label: string }> = [
  { value: 'forecast', label: 'Forecast' },
  { value: 'spend', label: 'Spend' },
  { value: 'timeline', label: 'Timeline' }
]
const RANGES = [7, 30, 90] as const

/** Last report per range, so reopening the modal shows data at once while a fresh scan runs. */
const reportCache = new Map<string, HistoryReport>()

/** Loads the history report for a range; null while the first load runs, 'failed' on error. */
function useHistory(days: number): HistoryReport | null | 'failed' {
  const showCosts = useStore((s) => s.settings.showCostEstimates)
  const cacheKey = `${days}:${showCosts}`
  const [report, setReport] = useState<HistoryReport | null | 'failed'>(() => reportCache.get(cacheKey) ?? null)
  useEffect(() => {
    let cancelled = false
    const cached = reportCache.get(cacheKey)
    setReport(cached ?? null)
    edge
      .getHistory(days)
      .then((r) => {
        reportCache.set(cacheKey, r)
        if (!cancelled) setReport(r)
      })
      .catch(() => !cancelled && !cached && setReport('failed'))
    return () => {
      cancelled = true
    }
  }, [days, cacheKey])
  return report
}

export function AnalyticsView() {
  const tab = useStore((s) => s.analyticsTab)
  const setTab = useStore((s) => s.setAnalyticsTab)
  const showUsage = useStore((s) => s.showUsage)
  const [days, setDays] = useState<number>(30)
  const report = useHistory(days)

  return (
    <div className="layer an">
      <header className="an-head">
        <button className="back-btn" onClick={showUsage}>
          <ArrowLeft size={14} />
          Usage
        </button>
        <h1 className="an-title">Analytics</h1>
        <Segmented<AnalyticsTab> value={tab} onChange={setTab} options={TABS} />
        <span className="spacer" />
        {tab === 'spend' && (
          <Segmented<number> value={days} onChange={setDays} options={RANGES.map((n) => ({ value: n, label: `${n}d` }))} />
        )}
        <button className="icon-btn" onClick={closeNotch} title="Close" aria-label="Close">
          <X size={15} />
        </button>
      </header>
      <ScrollArea className="an-scroll">
        {tab === 'forecast' && <ForecastTab />}
        {tab === 'spend' && <SpendTab report={report} days={days} />}
        {tab === 'timeline' && <TimelineTab />}
      </ScrollArea>
    </div>
  )
}
