/**
 * A tool's brand mark. The artwork lives in lib/providerLogos.ts (inline SVG from the
 * MIT-licensed @lobehub/icons set). Mono marks are tinted with the tool's colour;
 * colour marks keep their own. Tools without a mark get a coloured initial.
 */
import { useId, useMemo } from 'react'
import type { ProviderId } from '../../shared/usage'
import { LOGOS } from '../lib/providerLogos'
import { PROVIDER_META } from '../lib/providers'

export function ProviderLogo({ id, size = 16 }: { id: ProviderId; size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const logo = LOGOS[id]
  const { accent, glyph } = PROVIDER_META[id]
  // Gradient ids inside the artwork must be unique per instance on the page.
  const body = useMemo(() => (logo ? logo.body.replaceAll('_R_0_', `_${uid}_`) : ''), [logo, uid])

  if (!logo) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="plogo">
        <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="700" fill={accent}>
          {glyph}
        </text>
      </svg>
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={logo.viewBox}
      aria-hidden
      className="plogo"
      style={logo.mono ? { color: accent } : undefined}
      dangerouslySetInnerHTML={{ __html: logo.mono ? `<g fill="currentColor" fill-rule="evenodd">${body}</g>` : body }}
    />
  )
}
