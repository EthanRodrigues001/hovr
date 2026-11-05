import { Contours } from '@/components/dithercn/contours'

/** Drifting topographic lines, used as a quiet backdrop. Fills its positioned parent. */
export function ContourBg({ className = '', lines = 12, scale = 1, relief = 0.35, fade = 'to-bottom' }: { className?: string; lines?: number; scale?: number; relief?: number; fade?: 'to-bottom' | 'radial' | 'none' }) {
  const mask = fade === 'to-bottom' ? '[mask-image:linear-gradient(to_bottom,black_0%,transparent_85%)]' : fade === 'radial' ? '[mask-image:radial-gradient(ellipse_80%_90%_at_70%_0%,black,transparent_80%)]' : ''
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${mask} ${className}`}>
      <Contours className="absolute inset-0 size-full" lines={lines} scale={scale} relief={relief} speed={0.6} />
    </div>
  )
}
