'use client'

import { useEffect, useState } from 'react'
import { Logo } from '@/hovr/src/components/Logo'
import { ProviderLogo } from '@/hovr/src/components/ProviderLogo'
import { ProviderRing } from '@/hovr/src/components/ProviderRing'
import { WindowRow } from '@/hovr/src/components/WindowRow'
import type { ProviderId, UsageWindow } from '@/hovr/shared/usage'

const H = 3_600_000
const D = 24 * H
const FLARE = 12

function Flare({ side }: { side: 'l' | 'r' }) {
  return (
    <svg
      width={FLARE}
      height={FLARE}
      viewBox={`0 0 ${FLARE} ${FLARE}`}
      className="absolute top-0 block"
      style={side === 'l' ? { right: '100%' } : { left: '100%' }}
    >
      <path d={side === 'l' ? `M0 0 H${FLARE} V${FLARE} A${FLARE} ${FLARE} 0 0 0 0 0 Z` : `M${FLARE} 0 H0 V${FLARE} A${FLARE} ${FLARE} 0 0 1 ${FLARE} 0 Z`} fill="#000" />
    </svg>
  )
}

function Head({ id, name, plan }: { id: ProviderId; name: string; plan: string }) {
  return (
    <header className="pcard-head" style={{ marginTop: 6 }}>
      <ProviderRing id={id} remaining={50} size={28} />
      <span className="pcard-name">{name}</span>
      <span className="pcard-plan">{plan}</span>
      <span className="pcard-updated">just now</span>
    </header>
  )
}

/** 1200x630 social card built from the real HOVR components. Rendered to app/opengraph-image.png by scripts/og.cjs. */
export function OgCard() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => setNow(Date.now()), [])
  const iso = (ms: number) => new Date((now ?? 0) + ms).toISOString()
  const session: UsageWindow = { id: 'five_hour', kind: 'session', label: 'Session', usedPercent: 73, resetsAt: iso(3 * H), windowDurationMins: 300 }
  const weekly: UsageWindow = { id: 'seven_day', kind: 'weekly', label: 'Weekly', usedPercent: 30, resetsAt: iso(4.6 * D), windowDurationMins: 10080 }
  const monthly: UsageWindow = { id: 'monthly', kind: 'monthly', label: 'Monthly', usedPercent: 52, resetsAt: iso(18.8 * D), windowDurationMins: 31 * 1440 }
  const chips: Array<[ProviderId, number]> = [
    ['claude', 27],
    ['codex', 48],
    ['antigravity', 100]
  ]
  const tools: ProviderId[] = ['claude', 'codex', 'cursor', 'antigravity', 'grok', 'opencode']

  return (
    <div className="hovr-stage relative overflow-hidden bg-[#050505] text-white" style={{ width: 1200, height: 630, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_50%_0%,rgba(255,255,255,0.2),transparent_70%)]" />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[360px] [mask-image:linear-gradient(to_bottom,black,transparent)] bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:48px_48px]"
      />

      {/* the notch, collapsed */}
      <div className="absolute left-1/2 top-0 flex h-[52px] -translate-x-1/2 items-center gap-4 rounded-b-[26px] bg-black px-7 shadow-[0_0_60px_rgba(255,255,255,0.14)]">
        <Flare side="l" />
        <Flare side="r" />
        <span className="flex items-center gap-2 text-[17px] font-semibold tracking-wide">
          <Logo size={22} />
          HOVR
        </span>
        <span className="h-5 w-px bg-white/15" />
        {chips.map(([id, remaining]) => (
          <span key={id} className="flex items-center gap-1.5">
            <ProviderRing id={id} remaining={remaining} size={22} ring />
            <span className="text-[15px] font-semibold text-white/85">{remaining}%</span>
          </span>
        ))}
      </div>

      <div className="absolute inset-x-0 top-[96px] text-center">
        <h1 className="mx-auto text-balance text-[60px] font-semibold leading-[1.04] tracking-tight" style={{ width: 920 }}>
          Know what&apos;s left before your AI tools run dry.
        </h1>
        <p className="mt-4 text-[22px] text-white/55">Usage limits for Claude Code, Codex, Cursor and more. Free for Windows.</p>
        <div className="mt-5 flex items-center justify-center gap-3.5">
          {tools.map((id) => (
            <span key={id} className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
              <ProviderLogo id={id} size={18} />
            </span>
          ))}
        </div>
      </div>

      {/* the open card, cropped by the bottom edge */}
      <div className="absolute left-1/2 top-[370px] w-[640px] -translate-x-1/2 rounded-t-[26px] border border-b-0 border-white/15 bg-black px-3.5 pt-3 shadow-[0_-30px_80px_rgba(255,255,255,0.1)]">
        {now !== null && (
          <>
            <Head id="claude" name="Claude Code" plan="Pro" />
            <WindowRow window={session} now={now} provider="claude" />
            <WindowRow window={weekly} now={now} provider="claude" />
            <Head id="codex" name="Codex" plan="Free" />
            <WindowRow window={monthly} now={now} provider="codex" />
          </>
        )}
      </div>
    </div>
  )
}
