'use client'

import { useEffect, useState } from 'react'
import { Logo } from '@/hovr/src/components/Logo'
import { ProviderLogo } from '@/hovr/src/components/ProviderLogo'
import { ProviderRing } from '@/hovr/src/components/ProviderRing'
import { WindowRow } from '@/hovr/src/components/WindowRow'
import { LOGOS } from '@/hovr/src/lib/providerLogos'
import { PROVIDER_META } from '@/hovr/src/lib/providers'
import type { ProviderId, UsageWindow } from '@/hovr/shared/usage'

const H = 3_600_000
const D = 24 * H

function useNow() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => setNow(Date.now()), [])
  return now
}

function Frame({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <div className={`hovr-stage rounded-[22px] border border-white/8 bg-black p-3 ${className}`}>{children}</div>
}

/** Pace marker and run-out warning: the real usage row on a limit that is being burnt too fast. */
export function PaceMock() {
  const now = useNow()
  if (now === null) return <Frame className="h-[236px]" />
  const fast: UsageWindow = { id: 'five_hour', kind: 'session', label: 'Session', usedPercent: 73, resetsAt: new Date(now + 3 * H).toISOString(), windowDurationMins: 300 }
  const calm: UsageWindow = { id: 'seven_day', kind: 'weekly', label: 'Weekly', usedPercent: 30, resetsAt: new Date(now + 4.6 * D).toISOString(), windowDurationMins: 10080 }
  return (
    <Frame>
      <WindowRow window={fast} now={now} provider="claude" />
      <WindowRow window={calm} now={now} provider="claude" />
    </Frame>
  )
}

/** The collapsed pill: one ring per tool with what is left. */
export function PillMock() {
  const chips: Array<[ProviderId, number]> = [
    ['claude', 27],
    ['codex', 48],
    ['antigravity', 100]
  ]
  return (
    <Frame className="flex flex-1 items-center justify-center py-6">
      <div className="notch is-open !static !translate-x-0 rounded-full" style={{ position: 'static', width: 'auto', height: 'auto', borderRadius: 999 }}>
        <div className="pill" style={{ position: 'static' }}>
          {chips.map(([id, remaining]) => (
            <span className="chip" key={id}>
              <ProviderRing id={id} remaining={remaining} size={18} ring />
              <span className={`chip-pct ${remaining < 15 ? 'tone-critical' : ''}`}>{remaining}%</span>
            </span>
          ))}
        </div>
      </div>
    </Frame>
  )
}

const ALL: ProviderId[] = ['claude', 'codex', 'cursor', 'antigravity', 'grok', 'opencode', 'gemini', 'copilot']

/** Brand marks of the supported tools, using the app's own logo set. */
export function ToolGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ALL.filter((id) => LOGOS[id]).map((id) => (
        <div key={id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5 transition-colors hover:bg-white/[0.06]">
          <ProviderLogo id={id} size={22} />
          <span className="text-[14px] font-medium">{PROVIDER_META[id].short}</span>
        </div>
      ))}
    </div>
  )
}

/** A Windows-style notification, as HOVR sends when a limit is about to run out. */
export function NotificationMock() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#202023] p-3.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
      <div className="flex items-center gap-2 text-[11.5px] text-white/55">
        <Logo size={13} />
        HOVR
        <span className="ml-auto text-white/35">now</span>
      </div>
      <p className="mt-2 text-[13.5px] font-semibold text-white">Claude Code session: 27% left</p>
      <p className="mt-0.5 text-[12.5px] leading-snug text-white/60">At this pace it runs out in 44 minutes, before it resets in 2h 59m.</p>
    </div>
  )
}

/** Detected tools, each with its real brand mark. */
export function DetectedRow() {
  const rows: Array<[ProviderId, string]> = [
    ['claude', 'Claude Code · Pro'],
    ['codex', 'Codex · Free'],
    ['antigravity', 'Antigravity']
  ]
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      {rows.map(([id, label]) => (
        <div key={id} className="flex flex-1 items-center gap-3 rounded-xl border border-white/8 bg-black px-3 py-2.5">
          <ProviderLogo id={id} size={20} />
          <span className="text-[13.5px] font-medium">{label}</span>
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-white/45">
            <i className="size-1.5 rounded-full bg-[#4ade80]" />
            detected
          </span>
        </div>
      ))}
    </div>
  )
}
