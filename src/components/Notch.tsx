/**
 * Notch: the single visible surface. A black pill hanging from the top of the screen
 * that grows into the usage card (or the settings sheet) when opened.
 *
 * The BrowserWindow is a fixed transparent canvas (see shared/notch.ts); only this
 * element is painted. Size is animated with a spring; content layers crossfade.
 * The inverse-corner "flares" at the top blend the notch into the screen edge.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, ChevronRight, RefreshCw, Settings as Cog, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { NOTCH } from '../../shared/notch'
import { worstRemainingPercent } from '../../shared/usageMath'
import type { ProviderStatus } from '../../shared/usage'
import { closeNotch, registerNotchElement } from '../hooks/useNotchHover'
import { remainingTone } from '../lib/providers'
import { useStore } from '../store/appStore'
import { Logo } from './Logo'
import { ProviderRing } from './ProviderRing'
import { SettingsSheet } from './SettingsSheet'
import { AnalyticsView } from './analytics/AnalyticsView'
import { ToastStack } from './Toast'
import { UsageView } from './UsageView'

const FLARE = 14
const HEADER_H = 46
const FOOTER_H = 38
const MAX_CHIPS = 4

interface Chip {
  status: ProviderStatus
  remaining: number | null
}

/** Providers that get a chip in the collapsed pill. */
function useChips(): Chip[] {
  const providers = useStore((s) => s.providers)
  const usage = useStore((s) => s.usage)
  const pillShow = useStore((s) => s.settings.pillShow)
  return useMemo(() => {
    const chips: Chip[] = []
    for (const status of providers) {
      if (!status.enabled || !status.installed || !status.supportsLimits) continue
      const windows = usage[status.id]?.windows ?? []
      if (windows.length > 0) chips.push({ status, remaining: worstRemainingPercent(windows) })
      // Signed in but failing: show a "?" so a silent outage is visible.
      // An expired login cannot be fixed from here, so it stays out of the pill (the card still lists it).
      else if (status.authState === 'authenticated' && status.lastError && !/token expired|sign in/i.test(status.lastError)) {
        chips.push({ status, remaining: null })
      }
    }
    if (pillShow === 'tightest' && chips.length > 1) {
      const known = chips.filter((c) => c.remaining !== null)
      if (known.length > 0) return [known.reduce((a, b) => ((b.remaining as number) < (a.remaining as number) ? b : a))]
    }
    return chips
  }, [providers, usage, pillShow])
}

function CollapsedPill({ chips, style }: { chips: Chip[]; style: 'chips' | 'dots' }) {
  const loaded = useStore((s) => s.providers.length > 0)
  if (chips.length === 0) {
    return (
      <div className="pill pill-empty">
        <Logo size={14} />
        <span>{loaded ? 'No tools connected' : 'HOVR'}</span>
      </div>
    )
  }
  const shown = chips.slice(0, MAX_CHIPS)
  const extra = chips.length - shown.length
  return (
    <div className="pill">
      {shown.map(({ status, remaining }) => {
        const tone = remaining === null ? 'low' : remainingTone(remaining)
        return (
          <span className="chip" key={status.id} title={`${status.label}: ${remaining === null ? 'unavailable' : `${remaining}% left`}`}>
            <ProviderRing id={status.id} remaining={remaining} size={16} />
            {style === 'chips' && <span className={`chip-pct tone-${tone}`}>{remaining === null ? '?' : `${remaining}%`}</span>}
            {style === 'dots' && <span className={`dot tone-${tone}`} />}
          </span>
        )
      })}
      {extra > 0 && <span className="chip-more">+{extra}</span>}
    </div>
  )
}

function collapsedWidthFor(count: number, style: 'chips' | 'dots', loaded: boolean): number {
  if (count === 0) return loaded ? 168 : 110
  const per = style === 'chips' ? 62 : 38
  return Math.min(NOTCH.collapsedWidth + 40, 28 + Math.min(count, MAX_CHIPS) * per + (count > MAX_CHIPS ? 26 : 0))
}

function UsageLayer({ onContentHeight }: { onContentHeight: (h: number) => void }) {
  const refreshing = useStore((s) => s.refreshing)
  const refresh = useStore((s) => s.refresh)
  const openSettings = useStore((s) => s.openSettings)
  const openAnalytics = useStore((s) => s.openAnalytics)
  const contentRef = useRef<HTMLDivElement>(null)
  const usage = useStore((s) => s.usage)
  const providerCount = useStore((s) => s.providers.filter((p) => p.installed).length)
  const refreshMinutes = useStore((s) => s.settings.usageRefreshMinutes)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  const newest = Math.max(0, ...Object.values(usage).map((u) => (u ? Date.parse(u.checkedAt) || 0 : 0)))
  const mins = newest ? Math.floor((now - newest) / 60_000) : null
  const footerText =
    mins === null
      ? providerCount > 0
        ? 'Nothing to read yet'
        : 'Waiting for the first reading'
      : `Updated ${mins < 1 ? 'just now' : `${mins}m ago`} · refreshes every ${refreshMinutes} min`

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    const ro = new ResizeObserver(() => onContentHeight(el.offsetHeight))
    ro.observe(el)
    onContentHeight(el.offsetHeight)
    return () => ro.disconnect()
  }, [onContentHeight])

  return (
    <div className="layer">
      <div className="nhead" style={{ height: HEADER_H }}>
        <Logo size={15} />
        <span className="nhead-title">Usage</span>
        <span className="spacer" />
        <button className={`icon-btn ${refreshing ? 'spin' : ''}`} onClick={() => void refresh()} title="Refresh now" aria-label="Refresh now">
          <RefreshCw size={15} />
        </button>
        <button className="icon-btn" onClick={() => openAnalytics()} title="Analytics" aria-label="Analytics">
          <BarChart3 size={15} />
        </button>
        <button className="icon-btn" onClick={() => openSettings()} title="Settings" aria-label="Settings">
          <Cog size={15} />
        </button>
        <button className="icon-btn" onClick={closeNotch} title="Close" aria-label="Close">
          <X size={15} />
        </button>
      </div>
      <div className="nbody">
        <div ref={contentRef}>
          <UsageView />
        </div>
      </div>
      <div className="nfoot" style={{ height: FOOTER_H }}>
        <span className="nfoot-text">{footerText}</span>
        <span className="spacer" />
        <button className="nfoot-link" onClick={() => openAnalytics()}>
          Analytics <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

export function Notch() {
  const open = useStore((s) => s.open)
  const view = useStore((s) => s.view)
  const settings = useStore((s) => s.settings)
  const chips = useChips()
  const [contentH, setContentH] = useState(160)
  const onContentHeight = useCallback((h: number) => setContentH(h), [])

  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    registerNotchElement(ref.current)
    return () => registerNotchElement(null)
  }, [])

  const loaded = useStore((s) => s.providers.length > 0)
  const collapsedW = collapsedWidthFor(chips.length, settings.collapsedStyle, loaded)
  const target = !open
    ? { width: collapsedW, height: NOTCH.collapsedHeight, radius: NOTCH.collapsedHeight / 2 }
    : view === 'settings'
      ? { width: NOTCH.settingsWidth, height: NOTCH.settingsHeight, radius: 26 }
      : view === 'analytics'
        ? { width: NOTCH.analyticsWidth, height: NOTCH.analyticsHeight, radius: 28 }
        : { width: NOTCH.cardWidth, height: Math.min(NOTCH.cardMaxHeight, contentH + HEADER_H + FOOTER_H + 14), radius: 26 }

  const spring = settings.reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 360, damping: 34, mass: 0.85 }

  return (
    <div className="root">
      <motion.div
        ref={ref}
        className={`notch ${open ? 'is-open' : ''}`}
        initial={false}
        animate={{
          width: target.width,
          height: target.height,
          borderBottomLeftRadius: target.radius,
          borderBottomRightRadius: target.radius
        }}
        transition={spring}
        style={{ x: '-50%' }}
      >
        <span className="flare flare-l" style={{ width: FLARE, height: FLARE }}>
          <svg width={FLARE} height={FLARE} viewBox={`0 0 ${FLARE} ${FLARE}`}>
            <path d={`M0 0 H${FLARE} V${FLARE} A${FLARE} ${FLARE} 0 0 0 0 0 Z`} fill="#000" />
          </svg>
        </span>
        <span className="flare flare-r" style={{ width: FLARE, height: FLARE }}>
          <svg width={FLARE} height={FLARE} viewBox={`0 0 ${FLARE} ${FLARE}`}>
            <path d={`M${FLARE} 0 H0 V${FLARE} A${FLARE} ${FLARE} 0 0 1 ${FLARE} 0 Z`} fill="#000" />
          </svg>
        </span>

        <div className="clip">
          <AnimatePresence initial={false}>
            {!open && (
              <motion.div key="collapsed" className="layer layer-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
                <CollapsedPill chips={chips} style={settings.collapsedStyle} />
              </motion.div>
            )}
            {open && view === 'usage' && (
              <motion.div key="usage" className="layer-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, delay: 0.04 }}>
                <UsageLayer onContentHeight={onContentHeight} />
              </motion.div>
            )}
            {open && view === 'analytics' && (
              <motion.div key="analytics" className="layer-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, delay: 0.04 }}>
                <AnalyticsView />
              </motion.div>
            )}
            {open && view === 'settings' && (
              <motion.div key="settings" className="layer-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, delay: 0.04 }}>
                <SettingsSheet />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <ToastStack />
      </motion.div>
    </div>
  )
}
