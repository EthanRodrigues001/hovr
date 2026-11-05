'use client'

import { useEffect, useState } from 'react'
import { Logo } from '@/hovr/src/components/Logo'
import { ProviderLogo } from '@/hovr/src/components/ProviderLogo'
import { ProviderRing } from '@/hovr/src/components/ProviderRing'
import { WindowRow } from '@/hovr/src/components/WindowRow'
import type { ProviderId, UsageWindow } from '@/hovr/shared/usage'

const H = 3_600_000
const FLARE = 10

function Flare({ side }: { side: 'l' | 'r' }) {
  return (
    <svg width={FLARE} height={FLARE} viewBox={`0 0 ${FLARE} ${FLARE}`} className="absolute top-0 block" style={side === 'l' ? { right: '100%' } : { left: '100%' }}>
      <path d={side === 'l' ? `M0 0 H${FLARE} V${FLARE} A${FLARE} ${FLARE} 0 0 0 0 0 Z` : `M${FLARE} 0 H0 V${FLARE} A${FLARE} ${FLARE} 0 0 1 ${FLARE} 0 Z`} fill="#000" />
    </svg>
  )
}

function Terminal({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 pt-[72px] font-mono text-[15px] leading-[1.7] text-white/75">
      <p className="text-white/45">
        <span className="text-white/30">$</span> claude &quot;refactor the auth module&quot;
      </p>
      {children}
    </div>
  )
}

function Panel({ tag, tone, children }: { tag: string; tone: 'dim' | 'lit'; children: React.ReactNode }) {
  return (
    <div className="relative h-[450px] w-[548px] overflow-hidden rounded-[26px] border border-white/10 bg-[#0b0b0c]">
      <span
        className={`absolute left-5 top-5 z-10 rounded-full px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.12em] ${tone === 'lit' ? 'bg-white text-black' : 'bg-white/10 text-white/55'}`}
      >
        {tag}
      </span>
      {children}
    </div>
  )
}

/** 1200x630 social card: the same moment before and after HOVR. Rendered to app/opengraph-image.png (see /og). */
export function OgCard() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => setNow(Date.now()), [])
  const session: UsageWindow = { id: 'five_hour', kind: 'session', label: 'Session', usedPercent: 73, resetsAt: new Date((now ?? 0) + 3 * H).toISOString(), windowDurationMins: 300 }
  const chips: Array<[ProviderId, number]> = [
    ['claude', 27],
    ['codex', 48]
  ]
  const tools: ProviderId[] = ['claude', 'codex', 'cursor', 'antigravity', 'grok']

  return (
    <div className="hovr-stage relative overflow-hidden bg-[#050505] text-white" style={{ width: 1200, height: 630, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,255,255,0.08),transparent_70%)]" />

      {/* header */}
      <div className="absolute inset-x-10 top-8 flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-[20px] font-semibold tracking-wide">
          <Logo size={26} />
          HOVR
        </span>
        <span className="flex items-center gap-2.5">
          {tools.map((id) => (
            <span key={id} className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
              <ProviderLogo id={id} size={16} />
            </span>
          ))}
        </span>
      </div>

      <div className="absolute inset-x-10 top-[92px] flex justify-between">
        {/* before */}
        <Panel tag="Before" tone="dim">
          <Terminal>
            <p className="text-white/45">Working on it...</p>
            <p className="mt-3 text-[#f87171]">Error: usage limit reached.</p>
            <p className="text-[#f87171]/80">Your limit resets in 3h 12m.</p>
          </Terminal>
          <p className="absolute inset-x-6 bottom-7 text-[22px] font-medium leading-snug text-white/55">You find out when the request fails.</p>
        </Panel>

        {/* after */}
        <Panel tag="After" tone="lit">
          <div className="absolute left-1/2 top-0 z-10 flex h-[38px] -translate-x-1/2 items-center gap-3 rounded-b-[19px] bg-black px-5">
            <Flare side="l" />
            <Flare side="r" />
            {chips.map(([id, remaining]) => (
              <span key={id} className="flex items-center gap-1.5">
                <ProviderRing id={id} remaining={remaining} size={18} ring />
                <span className="text-[13px] font-semibold text-white/90">{remaining}%</span>
              </span>
            ))}
          </div>
          <Terminal>
            <p className="text-white/45">Working on it...</p>
            <p className="mt-3 text-[#4ade80]">Done. Refactored 12 files.</p>
          </Terminal>
          <div className="absolute inset-x-4 bottom-[70px] rounded-[18px] bg-black p-1.5">{now !== null && <WindowRow window={session} now={now} provider="claude" />}</div>
          <p className="absolute inset-x-6 bottom-5 text-[22px] font-medium leading-snug text-white">You see it coming.</p>
        </Panel>
      </div>

      <p className="absolute inset-x-10 bottom-7 text-[15px] text-white/40">Usage limits for Claude Code, Codex, Cursor and more, in a notch on your Windows screen.</p>
    </div>
  )
}
