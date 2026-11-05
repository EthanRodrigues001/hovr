/** The Windows logo, drawn in currentColor. */
export function WindowsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2 4.6 10.3 3.4v7.7H2V4.6Zm9.4-1.3L22 1.8v9.3H11.4V3.3ZM2 12.3h8.3v7.7L2 18.8v-6.5Zm9.4 0H22v9.9l-10.6-1.5v-8.4Z" />
    </svg>
  )
}
