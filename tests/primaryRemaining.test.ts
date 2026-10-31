import { describe, expect, it } from 'vitest'
import type { UsageWindow } from '../shared/usage'
import { primaryRemainingPercent } from '../shared/usageMath'

const w = (id: string, usedPercent: number, windowDurationMins?: number): UsageWindow =>
  ({ id, kind: 'session', label: id, usedPercent, ...(windowDurationMins ? { windowDurationMins } : {}) }) as UsageWindow

describe('primaryRemainingPercent', () => {
  it('uses the shortest window even when a longer one is tighter', () => {
    expect(primaryRemainingPercent([w('weekly', 80, 10_080), w('session', 31, 300)])).toBe(69)
  })

  it('falls back to the tightest window without durations', () => {
    expect(primaryRemainingPercent([w('a', 20), w('b', 60)])).toBe(40)
  })

  it('is null with no windows', () => {
    expect(primaryRemainingPercent([])).toBeNull()
  })
})
