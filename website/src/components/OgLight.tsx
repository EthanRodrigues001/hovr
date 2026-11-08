'use client'

import { useEffect, useState } from 'react'
import { UsageView } from '@/hovr/src/components/UsageView'
import { useStore } from '@/hovr/src/store/appStore'

import { Logo } from '@/hovr/src/components/Logo'
import { ProviderLogo } from '@/hovr/src/components/ProviderLogo'
import { ProviderRing } from '@/hovr/src/components/ProviderRing'
import type { ProviderId } from '@/hovr/shared/usage'
import { WindowsIcon } from './WindowsIcon'

const FONT = 'var(--font-inter), system-ui, sans-serif'

function Flare({ side, size }: { side: 'l' | 'r'; size: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute top-0 block" style={side === 'l' ? { right: '100%' } : { left: '100%' }}>
      <path d={side === 'l' ? `M0 0 H${size} V${size} A${size} ${size} 0 0 0 0 0 Z` : `M${size} 0 H0 V${size} A${size} ${size} 0 0 1 ${size} 0 Z`} fill="#000" />
    </svg>
  )
}

/** The notch, hanging from the top edge of whatever contains it. */
function Notch({ chips, h, ring, text, gap, px, flare }: { chips: Array<[ProviderId, number]>; h: number; ring: number; text: number; gap: number; px: number; flare: number }) {
  return (
    <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-center bg-black" style={{ height: h, gap, paddingInline: px, borderRadius: `0 0 ${h / 2}px ${h / 2}px` }}>
      <Flare side="l" size={flare} />
      <Flare side="r" size={flare} />
      {chips.map(([id, left]) => (
        <span key={id} className="flex items-center" style={{ gap: ring * 0.3 }}>
          <ProviderRing id={id} remaining={left} size={ring} ring />
          <span className={`font-semibold ${left < 30 ? 'text-[#f87171]' : 'text-white'}`} style={{ fontSize: text }}>
            {left}%
          </span>
        </span>
      ))}
    </div>
  )
}

function Brand({ size = 26, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 font-semibold tracking-wide text-black ${className}`} style={{ fontSize: size * 0.78 }}>
      <Logo size={size} />
      HOVR
    </span>
  )
}

function Free({ className = '', compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={`flex items-center rounded-full bg-black font-semibold text-white ${compact ? 'gap-2 px-4 py-2 text-[15px]' : 'gap-2.5 px-5 py-3 text-[18px]'} ${className}`}>
      <WindowsIcon size={compact ? 15 : 18} />
      Free for Windows
    </span>
  )
}

const Stage = ({ bg, children }: { bg: string; children: React.ReactNode }) => (
  <div className="hovr-stage relative overflow-hidden text-black" style={{ width: 1200, height: 630, fontFamily: FONT, background: bg }}>
    {children}
  </div>
)

const TILES: Array<{ id: ProviderId; x: number; y: number; size: number; rot: number; blur: number; o: number; side: 'l' | 'r' }> = [
  { id: 'claude', side: 'l', x: 78, y: 70, size: 124, rot: -11, blur: 0, o: 1 },
  { id: 'grok', side: 'l', x: 22, y: 236, size: 66, rot: 14, blur: 3, o: 0.85 },
  { id: 'cursor', side: 'l', x: 176, y: 292, size: 92, rot: -6, blur: 1.5, o: 0.95 },
  { id: 'antigravity', side: 'l', x: 60, y: 440, size: 58, rot: 9, blur: 5, o: 0.65 },
  { id: 'codex', side: 'r', x: 36, y: 128, size: 138, rot: 8, blur: 0, o: 1 },
  { id: 'cursor', side: 'r', x: 196, y: 54, size: 60, rot: -15, blur: 3.5, o: 0.8 },
  { id: 'antigravity', side: 'r', x: 120, y: 330, size: 86, rot: -10, blur: 1.5, o: 0.95 },
  { id: 'grok', side: 'r', x: 30, y: 452, size: 64, rot: 13, blur: 5, o: 0.65 }
]

/** The real usage cards (Claude Code and Codex) on sample data, without the drawer around them. */
function RealPanel() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void useStore.getState().hydrate()
    setReady(true)
  }, [])
  if (!ready) return null
  return (
    <div className="absolute left-1/2 top-[326px] h-[304px] w-[560px] -translate-x-1/2 overflow-hidden rounded-t-[30px] bg-black ring-1 ring-black/10 shadow-[0_-24px_80px_-24px_rgba(0,0,0,0.4)]">
      <div className="hovr-stage absolute left-0 top-0 origin-top-left" style={{ width: 600, height: 520, transform: 'scale(0.93)', background: '#000' }}>
        <div className="notch is-open" style={{ position: 'static', width: 600, transform: 'none', background: 'transparent', boxShadow: 'none', border: 0 }}>
          <div className="nbody" style={{ padding: '14px 16px' }}>
            <UsageView />
          </div>
        </div>
      </div>
    </div>
  )
}

/** 1. Real panel under one short headline, tilted tool tiles that blur with distance. */
function V1() {
  return (
    <Stage bg="linear-gradient(135deg,#eef2ff 0%,#fdf2f8 55%,#fff7ed 100%)">
      <div aria-hidden className="absolute left-1/2 top-[-140px] h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />
      {TILES.map((t, i) => (
        <span
          key={i}
          className="absolute flex items-center justify-center bg-black shadow-[0_26px_44px_-18px_rgba(0,0,0,0.5)]"
          style={{ [t.side === 'l' ? 'left' : 'right']: t.x, top: t.y, width: t.size, height: t.size, borderRadius: t.size * 0.26, transform: `rotate(${t.rot}deg)`, filter: t.blur ? `blur(${t.blur}px)` : undefined, opacity: t.o }}
        >
          <ProviderLogo id={t.id} size={t.size * 0.5} />
        </span>
      ))}
      <Notch chips={[['claude', 27], ['codex', 48], ['antigravity', 100]]} h={92} ring={44} text={34} gap={32} px={46} flare={20} />
      <div className="absolute inset-x-0 top-[122px] px-16 text-center">
        <h1 className="text-[84px] font-extrabold leading-[1.02] tracking-tighter">
          A Dynamic Island
          <br />
          for your AI limits.
        </h1>
      </div>
      <RealPanel />
      <Brand size={38} className="absolute bottom-8 left-12" />
      <div className="absolute bottom-[16px] right-12 flex flex-col items-center gap-2.5">
        <Free compact />
        <span className="text-[13px] font-medium text-black/45">Inspired by T3 Code & Edge-Drop</span>
      </div>
    </Stage>
  )
}

/** 2. Before / after split, the notch bridges the seam. */
function V2() {
  return (
    <Stage bg="#f7f7f5">
      <div className="absolute inset-y-0 left-0 w-1/2 bg-[#fdecec]" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[#e6f7ec]" />
      <Notch chips={[['claude', 27], ['codex', 48]]} h={84} ring={40} text={30} gap={30} px={44} flare={20} />
      <Brand className="absolute left-12 top-8" />

      <div className="absolute left-12 top-[170px] w-[500px]">
        <span className="rounded-full bg-[#dc2626] px-4 py-1.5 text-[15px] font-bold uppercase tracking-[0.14em] text-white">Before</span>
        <p className="mt-6 font-mono text-[18px] text-black/45">$ claude &quot;refactor the auth module&quot;</p>
        <p className="mt-3 font-mono text-[26px] font-semibold leading-snug text-[#dc2626]">
          Error: usage limit reached.
          <br />
          Resets in 3h 12m.
        </p>
        <p className="mt-9 text-[36px] font-bold leading-tight text-black/80">You find out when it fails.</p>
      </div>

      <div className="absolute left-[648px] top-[170px] w-[500px]">
        <span className="rounded-full bg-[#16a34a] px-4 py-1.5 text-[15px] font-bold uppercase tracking-[0.14em] text-white">After</span>
        <p className="mt-6 font-mono text-[18px] text-black/45">$ claude &quot;refactor the auth module&quot;</p>
        <p className="mt-3 font-mono text-[26px] font-semibold leading-snug text-[#15803d]">
          Done. Refactored 12 files.
          <br />
          27% left, resets in 2h 59m.
        </p>
        <p className="mt-9 text-[36px] font-bold leading-tight">You see it coming.</p>
      </div>

      <Free className="absolute bottom-8 left-1/2 -translate-x-1/2" />
    </Stage>
  )
}

function Toast({ title, body, className = '' }: { title: string; body: string; className?: string }) {
  return (
    <div className={`w-[470px] rounded-[22px] bg-white p-5 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.3)] ring-1 ring-black/5 ${className}`}>
      <div className="flex items-center gap-2.5 text-[15px] text-black/50">
        <Logo size={20} className="text-black" />
        HOVR
        <span className="ml-auto text-black/35">now</span>
      </div>
      <p className="mt-2.5 text-[22px] font-semibold leading-snug">{title}</p>
      <p className="mt-1 text-[17px] leading-snug text-black/55">{body}</p>
    </div>
  )
}

/** 3. Warm alert: a headline and Windows notifications. */
function V3() {
  return (
    <Stage bg="linear-gradient(160deg,#fff8ec 0%,#ffe9d2 100%)">
      <div aria-hidden className="absolute -right-40 -top-40 size-[640px] rounded-full bg-[#fbbf24]/35 blur-3xl" />
      <div aria-hidden className="absolute -bottom-52 left-20 size-[520px] rounded-full bg-[#f87171]/25 blur-3xl" />
      <Brand className="absolute left-14 top-10" />
      <div className="absolute left-14 top-[170px] w-[560px]">
        <h1 className="text-[74px] font-bold leading-[1.02] tracking-tight">
          It warns you
          <br />
          <span className="text-[#dc2626]">before</span> the
          <br />
          limit hits.
        </h1>
        <p className="mt-6 text-[24px] leading-snug text-black/60">Pace-aware alerts for every AI coding tool you use.</p>
      </div>
      <Toast className="absolute right-14 top-[120px] rotate-[3deg]" title="Claude Code session: 27% left" body="At this pace it runs out in 44 minutes, before it resets in 2h 59m." />
      <Toast className="absolute right-[100px] top-[330px] -rotate-[2deg]" title="Codex monthly will run out early" body="At the current pace it runs out Wed Nov 11, 8 days before it resets." />
      <Free className="absolute bottom-9 left-14" />
    </Stage>
  )
}

const TOOLS: Array<[ProviderId, string, number]> = [
  ['claude', 'Claude Code', 27],
  ['codex', 'Codex', 48],
  ['cursor', 'Cursor', 62],
  ['antigravity', 'Antigravity', 100],
  ['grok', 'Grok', 85]
]

/** 4. Bold type over a row of black tool cards. */
function V4() {
  return (
    <Stage bg="#fafafa">
      <div aria-hidden className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1.2px, transparent 1.2px)', backgroundSize: '26px 26px' }} />
      <Brand className="absolute left-12 top-9" />
      <Free className="absolute right-12 top-7" />
      <h1 className="absolute left-12 top-[122px] text-[104px] font-extrabold leading-[0.95] tracking-tighter">
        Every AI limit.
        <br />
        One notch.
      </h1>
      <div className="absolute inset-x-12 bottom-12 grid grid-cols-5 gap-4">
        {TOOLS.map(([id, name, left]) => (
          <div key={id} className="rounded-[26px] bg-black p-5 text-white shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <ProviderLogo id={id} size={30} />
              <ProviderRing id={id} remaining={left} size={26} ring />
            </div>
            <p className="mt-5 text-[18px] font-medium text-white/60">{name}</p>
            <p className={`mt-0.5 text-[52px] font-bold leading-none ${left < 30 ? 'text-[#f87171]' : 'text-white'}`}>{left}%</p>
          </div>
        ))}
      </div>
    </Stage>
  )
}

export function OgLight({ v }: { v: number }) {
  return [V1, V2, V3, V4][v - 1]?.() ?? <V1 />
}
