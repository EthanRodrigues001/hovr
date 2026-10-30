import { memo, forwardRef, useId, type SVGProps } from 'react'
import { MARK } from '../lib/markShapes'

export interface LogoProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Rendered size in px (or any CSS length). Square: the artwork is 1:1. */
  size?: number | string
  /**
   * Accessible label. Omit for decorative use (the default) and the SVG is
   * hidden from assistive tech instead of being announced as an unnamed image.
   */
  title?: string
}

/**
 * The hovr mark: a screen seen at an angle with a notch (with a progress loader in it) hanging
 * from the top edge. Drawn in `currentColor` with the face cut out, so it takes the
 * surrounding text colour. The shapes come from scripts/make-icons.cjs, which also
 * renders the app icon, so the two never drift apart.
 */
export const Logo = memo(
  forwardRef<SVGSVGElement, LogoProps>(function Logo({ size = 24, title, ...props }, ref) {
    const mask = `logo-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
    const { BODY, FACE, NOTCH, LOADER, STROKE } = MARK
    const { cx, cy, r, w } = LOADER
    const o = 8.6
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="100 120 310 310"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role={title ? 'img' : undefined}
        aria-hidden={title ? undefined : true}
        focusable="false"
        {...props}
      >
        {title ? <title>{title}</title> : null}
        <defs>
          <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
            <polygon points={BODY} fill="#fff" stroke="#fff" strokeWidth={STROKE} strokeLinejoin="round" />
            <rect x={FACE.x} y={FACE.y} width={FACE.w} height={FACE.h} rx={FACE.r} fill="#000" />
            <path d={NOTCH} fill="#fff" />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#000" strokeOpacity={0.65} strokeWidth={w} />
            <path d={`M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - r} ${cy}`} fill="none" stroke="#000" strokeWidth={w} strokeLinecap="round" />
            <circle cx={cx - o} cy={cy - o} r={3.5} fill="none" stroke="#000" strokeWidth={2.8} />
            <circle cx={cx + o} cy={cy + o} r={3.5} fill="none" stroke="#000" strokeWidth={2.8} />
            <path d={`M${cx + 8.5} ${cy - 9.5} L${cx - 8.5} ${cy + 9.5}`} stroke="#000" strokeWidth={3} strokeLinecap="round" />
          </mask>
        </defs>
        <rect width="512" height="512" fill="currentColor" mask={`url(#${mask})`} />
      </svg>
    )
  })
)

Logo.displayName = 'Logo'

export default Logo
