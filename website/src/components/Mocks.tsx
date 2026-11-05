'use client'

import { useEffect, useState } from 'react'
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
  if (now === null) return <Frame className="h-[190px]" />
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
    <Frame className="flex h-[190px] items-center justify-center">
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
