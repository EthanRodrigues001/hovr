/**
 * A tiny circular gauge showing how much of an allowance is left. At sizes of 20px and up it renders the tool's logo instead.
 * provider's accent. `remaining` is 0-100; null draws an empty ring.
 */
import { PROVIDER_META } from '../lib/providers'
import { ProviderLogo } from './ProviderLogo'
import type { ProviderId } from '../../shared/usage'

interface Props {
  id: ProviderId
  remaining: number | null
  size?: number
}

export function ProviderRing({ id, remaining, size = 18 }: Props) {
  const { accent } = PROVIDER_META[id]
  const stroke = Math.max(2, size * 0.15)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const frac = remaining === null ? 0 : Math.max(0, Math.min(1, remaining / 100))
  const withLogo = size >= 20
  const ring = (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 400ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
    </svg>
  )
  // Big spots show the logo alone (the bars next to it already show progress);
  // the tiny pill spots show the progress ring alone.
  if (!withLogo) return ring
  return <ProviderLogo id={id} size={Math.round(size * 0.85)} />
}
