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
    const { BODY, BODY_STROKE, FACE, FACE_STROKE, LEAN, NOTCH, LOADER, VIEW, CANVAS } = MARK
    const { cx, cy, r, w } = LOADER
    const o = 6.6
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.size} ${VIEW.size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role={title ? 'img' : undefined}
        aria-hidden={title ? undefined : true}
        focusable="false"
        {...props}
      >
        {title ? <title>{title}</title> : null}
        <defs>
          <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width={CANVAS.w} height={CANVAS.h}>
            <polygon points={BODY} fill="#fff" stroke="#fff" strokeWidth={BODY_STROKE} strokeLinejoin="round" />
            <polygon points={FACE} fill="#000" stroke="#000" strokeWidth={FACE_STROKE} strokeLinejoin="round" />
            <g transform={`matrix(1 0 ${LEAN} 1 ${-LEAN * 350} 0)`}>
              <path d={NOTCH} fill="#fff" />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#000" strokeOpacity={0.65} strokeWidth={w} />
              <path d={`M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - r} ${cy}`} fill="none" stroke="#000" strokeWidth={w} strokeLinecap="round" />
              <circle cx={cx - o} cy={cy - o} r={2.7} fill="none" stroke="#000" strokeWidth={2.2} />
              <circle cx={cx + o} cy={cy + o} r={2.7} fill="none" stroke="#000" strokeWidth={2.2} />
              <path d={`M${cx + 6.5} ${cy - 7.5} L${cx - 6.5} ${cy + 7.5}`} stroke="#000" strokeWidth={2.4} strokeLinecap="round" />
            </g>
          </mask>
        </defs>
        <rect width={CANVAS.w} height={CANVAS.h} fill="currentColor" mask={`url(#${mask})`} />
      </svg>
    )
  })
)

Logo.displayName = 'Logo'

export default Logo
