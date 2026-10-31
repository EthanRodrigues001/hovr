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
/** Arc from 12 o'clock, clockwise, covering `pct` percent of the ring. */
function arc(cx: number, cy: number, r: number, pct: number): string {
  const a = (pct / 100) * Math.PI * 2
  return `M${cx} ${cy - r}A${r} ${r} 0 ${pct > 50 ? 1 : 0} 1 ${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`
}

export const Logo = memo(
  forwardRef<SVGSVGElement, LogoProps>(function Logo({ size = 24, title, ...props }, ref) {
    const mask = `logo-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
    const { BODY_PATH, FACE_PATH, NOTCH, VIEW, CANVAS } = MARK
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
            <path d={BODY_PATH} fill="#fff" />
            <path d={FACE_PATH} fill="#000" />
            <g transform={`matrix(1 0 ${NOTCH.lean} 1 ${-NOTCH.lean * NOTCH.top} 0)`}>
              <path d={NOTCH.d} fill="#fff" />
              {NOTCH.items.map(({ cx, cy, pct, text }) => (
                <g key={cx}>
                  {pct >= 100 ? (
                    <circle cx={cx} cy={cy} r={NOTCH.r} fill="none" stroke="#000" strokeWidth={NOTCH.w} />
                  ) : (
                    <>
                      <circle cx={cx} cy={cy} r={NOTCH.r} fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={NOTCH.w} />
                      <path d={arc(cx, cy, NOTCH.r, pct)} fill="none" stroke="#000" strokeWidth={NOTCH.w} strokeLinecap="round" />
                    </>
                  )}
                  {[...text].map((ch, i) => (
                    <path
                      key={i}
                      d={NOTCH.glyphs[ch as keyof typeof NOTCH.glyphs]}
                      transform={`translate(${cx + NOTCH.r + NOTCH.w / 2 + 4 + i * NOTCH.adv * NOTCH.k} ${cy - 3.5 * NOTCH.k}) scale(${NOTCH.k})`}
                      fill="none"
                      stroke="#000"
                      strokeWidth={NOTCH.gw}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              ))}
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
