import { memo, forwardRef, type SVGProps } from 'react'

const PATH = 'M24 56H176V104A40 40 0 0 1 136 144H64A40 40 0 0 1 24 104Z'

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
 * Placeholder artwork (a notch silhouette) until a real logo exists.
 */
export const Logo = memo(
  forwardRef<SVGSVGElement, LogoProps>(function Logo({ size = 24, title, ...props }, ref) {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 200 200"
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
