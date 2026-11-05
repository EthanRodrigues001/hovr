'use client'

import { motion } from 'motion/react'
import { Download } from 'lucide-react'
import { Logo } from '@/hovr/src/components/Logo'

const FLARE = 10
const LINKS = [
  ['Demo', '#demo'],
  ['Features', '#features'],
  ['Tools', '#tools'],
  ['Install', '#install'],
  ['Privacy', '#privacy']
] as const

function Flare({ side }: { side: 'l' | 'r' }) {
  return (
    <span className="pointer-events-none absolute top-0" style={side === 'l' ? { right: '100%' } : { left: '100%' }}>
      <svg width={FLARE} height={FLARE} viewBox={`0 0 ${FLARE} ${FLARE}`} className="block">
        <path
          d={side === 'l' ? `M0 0 H${FLARE} V${FLARE} A${FLARE} ${FLARE} 0 0 0 0 0 Z` : `M${FLARE} 0 H0 V${FLARE} A${FLARE} ${FLARE} 0 0 1 ${FLARE} 0 Z`}
          fill="#000"
        />
      </svg>
    </span>
  )
}

/** A navbar drawn as the HOVR notch: black, hanging from the top edge, with the inverse corners. */
export function NotchNav({ downloadUrl }: { downloadUrl: string }) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <div aria-hidden className="absolute top-0 h-16 w-[min(760px,92vw)] bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,rgba(255,255,255,0.22),transparent_72%)] blur-md" />
      <motion.nav
        initial={{ y: -60, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.85, delay: 0.1 }}
        className="pointer-events-auto relative flex h-[46px] max-w-[calc(100vw-40px)] items-center gap-1 rounded-b-[22px] bg-black pl-4 pr-2 text-white shadow-[0_0_44px_rgba(255,255,255,0.1)]"
        aria-label="Main"
      >
        <Flare side="l" />
        <Flare side="r" />
        <a href="#top" className="flex items-center gap-2 pr-2 text-[13.5px] font-semibold tracking-wide">
          <Logo size={18} />
          HOVR
        </a>
        <span className="mx-1 hidden h-4 w-px bg-white/10 md:block" />
        <div className="hidden items-center md:flex">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} className="rounded-full px-3 py-1.5 text-[13px] text-white/60 transition-colors hover:bg-white/10 hover:text-white">
              {label}
            </a>
          ))}
        </div>
        <a
          href="https://github.com/EthanRodrigues001/hovr"
          aria-label="GitHub"
          className="ml-1 hidden size-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white sm:flex"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>
        </a>
        <a
          href={downloadUrl}
          className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
        >
          <Download size={14} strokeWidth={2.4} />
          Download
        </a>
      </motion.nav>
    </header>
  )
}
