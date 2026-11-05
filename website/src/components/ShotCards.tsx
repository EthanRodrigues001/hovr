'use client'

import { Logo } from '@/hovr/src/components/Logo'
import { ProviderLogo } from '@/hovr/src/components/ProviderLogo'
import { ProviderRing } from '@/hovr/src/components/ProviderRing'
import type { ProviderId } from '@/hovr/shared/usage'

const FLARE = 12
const CARDS: Array<[ProviderId, string, number]> = [
  ['claude', 'Claude Code', 27],
  ['codex', 'Codex', 48],
  ['antigravity', 'Antigravity', 100]
]
function Flare({ side }: { side: 'l' | 'r' }) {
  return (
    <svg width={FLARE} height={FLARE} viewBox={`0 0 ${FLARE} ${FLARE}`} className="absolute top-0 block" style={side === 'l' ? { right: '100%' } : { left: '100%' }}>
      <path d={side === 'l' ? `M0 0 H${FLARE} V${FLARE} A${FLARE} ${FLARE} 0 0 0 0 0 Z` : `M${FLARE} 0 H0 V${FLARE} A${FLARE} ${FLARE} 0 0 1 ${FLARE} 0 Z`} fill="#000" />
    </svg>
  )
}

/** 960x640 render of the collapsed notch, for the feature section. Screenshot source, see scripts/crops.cjs. */
export function PillShot() {
  const chips: Array<[ProviderId, number]> = [['claude', 27], ['codex', 48], ['antigravity', 100]]
  return (
    <div className="hovr-stage relative overflow-hidden bg-[#0d0d0f]" style={{ width: 960, height: 640, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(255,255,255,0.07),transparent_70%)]" />
      <div className="absolute left-1/2 top-0 flex h-[84px] -translate-x-1/2 items-center gap-8 rounded-b-[42px] bg-black px-14" style={{ filter: 'drop-shadow(0 0 40px rgba(255,255,255,0.08))' }}>
        <svg width={FLARE * 2} height={FLARE * 2} viewBox={`0 0 ${FLARE} ${FLARE}`} className="absolute top-0 block" style={{ right: '100%' }}>
          <path d={`M0 0 H${FLARE} V${FLARE} A${FLARE} ${FLARE} 0 0 0 0 0 Z`} fill="#000" />
        </svg>
        <svg width={FLARE * 2} height={FLARE * 2} viewBox={`0 0 ${FLARE} ${FLARE}`} className="absolute top-0 block" style={{ left: '100%' }}>
          <path d={`M${FLARE} 0 H0 V${FLARE} A${FLARE} ${FLARE} 0 0 1 ${FLARE} 0 Z`} fill="#000" />
        </svg>
        <Logo size={34} />
        {chips.map(([id, remaining]) => (
          <span key={id} className="flex items-center gap-3">
            <ProviderRing id={id} remaining={remaining} size={40} ring />
            <span className={`text-[30px] font-semibold ${remaining < 30 ? 'text-[#f87171]' : 'text-white'}`}>{remaining}%</span>
          </span>
        ))}
      </div>
      <div className="absolute inset-x-14 top-[190px] grid grid-cols-3 gap-5">
        {CARDS.map(([id, name, left]) => (
          <div key={id} className="rounded-3xl border border-white/10 bg-black p-6">
            <ProviderLogo id={id} size={36} />
            <p className="mt-5 text-[24px] font-semibold">{name}</p>
            <p className={`mt-1 text-[48px] font-semibold leading-none ${left < 30 ? 'text-[#f87171]' : 'text-white'}`}>{left}%</p>
            <p className="mt-2 text-[20px] text-white/45">left</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Toast({ title, body, app = true }: { title: string; body: string; app?: boolean }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#202023] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,1)]">
      {app && (
        <div className="flex items-center gap-3 text-[20px] text-white/55">
          <Logo size={22} />
          HOVR
          <span className="ml-auto text-white/35">now</span>
        </div>
      )}
      <p className="mt-3 text-[26px] font-semibold text-white">{title}</p>
      <p className="mt-1 text-[21px] leading-snug text-white/60">{body}</p>
    </div>
  )
}

/** 960x640 render of two HOVR notifications. */
export function AlertShot() {
  return (
    <div className="relative flex flex-col justify-center gap-5 overflow-hidden bg-[#0d0d0f] px-14" style={{ width: 960, height: 640, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(255,255,255,0.07),transparent_70%)]" />
      <div className="relative space-y-5">
        <Toast title="Claude Code session: 27% left" body="At this pace it runs out in 44 minutes, before it resets in 2h 59m." />
        <Toast app={false} title="Codex monthly will run out early" body="At the current pace it runs out Wed Nov 11, 8 days before it resets." />
      </div>
    </div>
  )
}
