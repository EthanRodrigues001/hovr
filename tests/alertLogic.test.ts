import { describe, expect, it } from 'vitest'
import { isNewWindow } from '../shared/alertLogic'
import type { UsageWindow } from '../shared/usage'

const base = Date.UTC(2026, 9, 31, 0, 3, 33)
const win = (o: Partial<UsageWindow>): UsageWindow => ({
  id: 'w',
  kind: 'session',
  label: 'Session',
  usedPercent: 50,
  windowDurationMins: 300,
  resetsAt: new Date(base).toISOString(),
  ...o
})

describe('isNewWindow', () => {
  it('ignores jitter in the reset time between reads', () => {
    expect(isNewWindow({ resetsAt: base, used: 50 }, win({ resetsAt: new Date(base + 14_000).toISOString() }))).toBe(false)
    expect(isNewWindow({ resetsAt: base, used: 50 }, win({ resetsAt: new Date(base - 9_000).toISOString() }))).toBe(false)
  })

  it('recognises the next window when the reset time jumps forward by a window length', () => {
    const next = new Date(base + 300 * 60_000).toISOString()
    expect(isNewWindow({ resetsAt: base, used: 90 }, win({ resetsAt: next, usedPercent: 2 }))).toBe(true)
  })

  it('recognises a reset from a sharp drop in usage', () => {
    expect(isNewWindow({ resetsAt: base, used: 90 }, win({ usedPercent: 5 }))).toBe(true)
  })

  it('does not treat normal growth as a new window', () => {
    expect(isNewWindow({ resetsAt: base, used: 50 }, win({ usedPercent: 60 }))).toBe(false)
  })
})
