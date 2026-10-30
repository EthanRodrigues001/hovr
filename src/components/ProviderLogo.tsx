/**
 * Simple vector marks for each tool, drawn in the tool's own brand colour. These are
 * small stylised glyphs (not the official artwork) so they stay crisp at 12-28px and
 * need no image assets. Tools without a mark get a coloured initial.
 */
import { useId } from 'react'
import type { ProviderId } from '../../shared/usage'
import { PROVIDER_META } from '../lib/providers'

const rays = (n: number) => Array.from({ length: n }, (_, i) => (i * 360) / n)

function Glyph({ id, color }: { id: ProviderId; color: string }) {
  const grad = useId()
  switch (id) {
    case 'claude':
      // The spark: eight rounded rays, long and short alternating.
      return (
        <g stroke={color} strokeLinecap="round" strokeWidth={2.2}>
          {rays(8).map((a, i) => (
            <line key={a} x1="12" y1="6" x2="12" y2={i % 2 ? 4 : 1.6} transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
      )
    case 'codex':
      // A six-petal knot.
      return (
        <g fill="none" stroke={color} strokeWidth={1.7}>
          {rays(6).map((a) => (
            <ellipse key={a} cx="12" cy="6.6" rx="3.4" ry="5.6" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
      )
    case 'cursor':
      return (
        <g fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round">
          <path d="M12 2.5 20.5 7.2v9.6L12 21.5 3.5 16.8V7.2z" />
          <path d="M12 12v9.5M3.5 7.2 12 12l8.5-4.8" />
        </g>
      )
    case 'antigravity':
      return (
        <g fill="none" strokeLinecap="round">
          <defs>
            <linearGradient id={grad} x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#4285F4" />
              <stop offset="0.45" stopColor="#EA4335" />
              <stop offset="1" stopColor="#FBBC04" />
            </linearGradient>
          </defs>
          <path d="M4.5 20.5C7 14 9.2 5 12 4.5s5 9.5 7.5 16" stroke={`url(#${grad})`} strokeWidth={3} />
          <path d="M8.2 15.2h7.6" stroke="#34A853" strokeWidth={2.2} />
        </g>
      )
    case 'grok':
      return (
        <g fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
          <circle cx="12" cy="12" r="7.2" />
          <path d="M4.2 19.8 19.8 4.2" />
        </g>
      )
    case 'opencode':
      return (
        <g fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 6 3.5 12l5 6M15.5 6l5 6-5 6" />
        </g>
      )
    case 'gemini':
      return <path d="M12 2c.7 5.6 4.4 9.3 10 10-5.6.7-9.3 4.4-10 10-.7-5.6-4.4-9.3-10-10 5.6-.7 9.3-4.4 10-10z" fill={color} />
    default: {
      const initial = PROVIDER_META[id].glyph
      return (
        <text x="12" y="16.5" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
          {initial}
        </text>
      )
    }
  }
}

export function ProviderLogo({ id, size = 16 }: { id: ProviderId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="plogo">
      <Glyph id={id} color={PROVIDER_META[id].accent} />
    </svg>
  )
}
