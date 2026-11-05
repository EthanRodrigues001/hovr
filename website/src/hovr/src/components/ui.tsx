/**
 * Small form primitives used by the settings sheet: an on/off switch and a
 * segmented control. Mouse-only on purpose: the notch window is not focusable.
 */
import type { ReactNode } from 'react'

export function Switch({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange
}: {
  value: T
  options: ReadonlyArray<{ value: T; label: ReactNode }>
  onChange: (next: T) => void
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={`seg ${o.value === value ? 'on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Row({
  title,
  hint,
  children
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="srow">
      <div className="srow-text">
        <div className="srow-title">{title}</div>
        {hint && <div className="srow-hint">{hint}</div>}
      </div>
      <div className="srow-ctl">{children}</div>
    </div>
  )
}
