import { memo, forwardRef, type SVGProps } from 'react'

const PATH = 'M70 22H442C400 22 378 46 378 102V204C378 272 326 328 256 328C186 328 134 272 134 204V102C134 46 112 22 70 22Z'

export interface LogoProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Rendered size in px (or any CSS length). Square — the artwork is 1:1. */
  size?: number | string
  /**
   * Accessible label. Omit for decorative use (the default) and the SVG is
   * hidden from assistive tech instead of being announced as an unnamed image.
   */
  title?: string
}

/**
 * The hovr mark.
 *
 * Inherits `currentColor`, so it takes the surrounding text color and can be
 * transitioned via CSS `color` — which is what lets it tint on hover alongside
 * the rest of the blade without a second render path.
 *
 * The notch silhouette (same shape as the app icon).
 */
export const Logo = memo(
  forwardRef<SVGSVGElement, LogoProps>(function Logo({ size = 24, title, ...props }, ref) {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role={title ? 'img' : undefined}
        aria-hidden={title ? undefined : true}
        focusable="false"
        {...props}
      >
        {title ? <title>{title}</title> : null}
        <path fillRule="evenodd" clipRule="evenodd" d={PATH} fill="currentColor" />
      </svg>
    )
  })
)

Logo.displayName = 'Logo'

export default Logo
