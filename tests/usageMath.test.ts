import { describe, expect, it } from 'vitest'
import type { UsageLimits, UsageWindow } from '../shared/usage'
import {
  clampPercent,
  elapsedShare,
  formatDuration,
  formatResetsIn,
  limitsNotice,
  makeUnavailableLimits,
  makeUsageLimits,
  mergeUsageUpdate,
  paceOf,
  paceRemainingPercent,
  remainingPercent,
  resolveAfterProbe,
  sortWindows,
  worstRemainingPercent
} from '../shared/usageMath'

const NOW = Date.parse('2026-01-01T00:00:00Z')
const iso = (offsetMin: number) => new Date(NOW + offsetMin * 60_000).toISOString()
const win = (o: Partial<UsageWindow> & { id: string }): UsageWindow => ({
  kind: 'session',
  label: o.id,
  usedPercent: 0,
  ...o
})

describe('clampPercent', () => {
  it('clamps and neutralises non-finite', () => {
    expect(clampPercent(-4)).toBe(0)
    expect(clampPercent(140)).toBe(100)
    expect(clampPercent(NaN)).toBe(0)
    expect(clampPercent(42.5)).toBe(42.5)
  })
})

describe('sortWindows', () => {
  it('orders by kind then id', () => {
    const out = sortWindows([
      win({ id: 'b', kind: 'monthly' }),
      win({ id: 'z', kind: 'session' }),
      win({ id: 'a', kind: 'session' }),
      win({ id: 'w', kind: 'weekly' })
    ])
    expect(out.map((w) => w.id)).toEqual(['a', 'z', 'w', 'b'])
  })
})

describe('remainingPercent', () => {
  it('is 100 - used, rounded and clamped', () => {
    expect(remainingPercent(win({ id: 'a', usedPercent: 33.4 }))).toBe(67)
    expect(remainingPercent(win({ id: 'a', usedPercent: 250 }))).toBe(0)
  })
})

describe('pace', () => {
  // 100 minute window, 50 minutes left => 50% elapsed.
  const w = (usedPercent: number) =>
    win({ id: 'a', usedPercent, resetsAt: iso(50), windowDurationMins: 100 })

  it('elapsedShare', () => {
    expect(elapsedShare(w(0), NOW)).toBeCloseTo(0.5)
    expect(elapsedShare(win({ id: 'a', resetsAt: iso(50) }), NOW)).toBeNull()
    expect(elapsedShare(win({ id: 'a', windowDurationMins: 100 }), NOW)).toBeNull()
    expect(
      elapsedShare(win({ id: 'a', resetsAt: 'garbage', windowDurationMins: 100 }), NOW)
    ).toBeNull()
    expect(
      elapsedShare(win({ id: 'a', resetsAt: iso(500), windowDurationMins: 100 }), NOW)
    ).toBe(0)
    expect(
      elapsedShare(win({ id: 'a', resetsAt: iso(-5), windowDurationMins: 100 }), NOW)
    ).toBe(1)
    expect(elapsedShare(win({ id: 'a', resetsAt: iso(5), windowDurationMins: 0 }), NOW)).toBeNull()
  })

  it('paceOf uses a 5 point tolerance', () => {
    expect(paceOf(w(56), NOW)).toBe('ahead')
    expect(paceOf(w(55), NOW)).toBe('on')
    expect(paceOf(w(45), NOW)).toBe('on')
    expect(paceOf(w(44), NOW)).toBe('under')
    expect(paceOf(win({ id: 'a', usedPercent: 99 }), NOW)).toBeNull()
  })

  it('paceRemainingPercent tracks time remaining', () => {
    expect(paceRemainingPercent(w(0), NOW)).toBe(50)
    expect(paceRemainingPercent(win({ id: 'a' }), NOW)).toBeNull()
  })
})

describe('formatting', () => {
  it('formatDuration', () => {
    expect(formatDuration(-1)).toBe('0m')
    expect(formatDuration(59 * 60_000)).toBe('59m')
    expect(formatDuration(90 * 60_000)).toBe('1h 30m')
    expect(formatDuration((2 * 24 + 5) * 3_600_000)).toBe('2d 5h')
  })

  it('formatResetsIn', () => {
    const at = (m: number) => win({ id: 'a', resetsAt: iso(m) })
    expect(formatResetsIn(win({ id: 'a' }), NOW)).toBeNull()
    expect(formatResetsIn(at(-1), NOW)).toBe('resets now')
    expect(formatResetsIn(at(0.5), NOW)).toBe('resets momentarily')
    expect(formatResetsIn(at(125), NOW)).toBe('resets in 2h 5m')
  })
})

describe('mergeUsageUpdate', () => {
  const base = makeUsageLimits({
    checkedAt: iso(0),
    windows: [win({ id: 'a', usedPercent: 10, resetsAt: iso(60), windowDurationMins: 300 })]
  })

  it('keeps old resetsAt/duration when the update omits them', () => {
    const out = mergeUsageUpdate({
      previous: base,
      update: [win({ id: 'a', usedPercent: 20 })],
      checkedAt: iso(1)
    })!
    expect(out.windows[0]).toMatchObject({
      usedPercent: 20,
      resetsAt: iso(60),
      windowDurationMins: 300
    })
  })

  it('returns the same reference when nothing changed', () => {
    const same = { ...base.windows[0] }
    expect(mergeUsageUpdate({ previous: base, update: [same], checkedAt: iso(1) })).toBe(base)
  })

  it('adds new ids and re-sorts', () => {
    const out = mergeUsageUpdate({
      previous: base,
      update: [win({ id: 'w', kind: 'weekly', usedPercent: 5 })],
      checkedAt: iso(1)
    })!
    expect(out.windows.map((w) => w.id)).toEqual(['a', 'w'])
  })

  it('ignores empty updates and unsupported accounts', () => {
    expect(mergeUsageUpdate({ previous: base, update: [], checkedAt: iso(1) })).toBe(base)
    const unsupported = makeUnavailableLimits({ checkedAt: iso(0), reason: 'unsupported' })
    expect(
      mergeUsageUpdate({ previous: unsupported, update: [win({ id: 'a' })], checkedAt: iso(1) })
    ).toBe(unsupported)
  })

  it('marks a first-ever partial update as probeFailed', () => {
    const out = mergeUsageUpdate({
      previous: undefined,
      update: [win({ id: 'a' })],
      checkedAt: iso(1)
    })!
    expect(out.unavailable?.reason).toBe('probeFailed')
  })

  it('clamps percent', () => {
    const out = mergeUsageUpdate({
      previous: base,
      update: [win({ id: 'a', usedPercent: 400 })],
      checkedAt: iso(1)
    })!
    expect(out.windows[0].usedPercent).toBe(100)
  })
})

describe('resolveAfterProbe', () => {
  const good: UsageLimits = makeUsageLimits({
    checkedAt: iso(10),
    windows: [win({ id: 'a', usedPercent: 30 })]
  })

  it('retains last good bars on probeFailed', () => {
    const failed = makeUnavailableLimits({ checkedAt: iso(20), reason: 'probeFailed' })
    expect(resolveAfterProbe({ published: good, probed: failed })).toBe(good)
  })

  it('clears bars on unsupported', () => {
    const unsupported = makeUnavailableLimits({ checkedAt: iso(20), reason: 'unsupported' })
    expect(resolveAfterProbe({ published: good, probed: unsupported })).toBe(unsupported)
  })

  it('a stale probe never overwrites a newer snapshot', () => {
    const stale = makeUsageLimits({
      checkedAt: iso(5),
      windows: [win({ id: 'a', usedPercent: 90 })]
    })
    const out = resolveAfterProbe({ published: good, probed: stale })!
    expect(out.checkedAt).toBe(good.checkedAt)
    expect(out.windows).toBe(good.windows)
  })

  it('passes through a fresh probe', () => {
    const fresh = makeUsageLimits({
      checkedAt: iso(30),
      windows: [win({ id: 'a', usedPercent: 50 })]
    })
    expect(resolveAfterProbe({ published: good, probed: fresh })).toBe(fresh)
  })
})

describe('limitsNotice / worstRemainingPercent', () => {
  it('notices', () => {
    expect(
      limitsNotice(makeUnavailableLimits({ checkedAt: iso(0), reason: 'unsupported' }))
    ).toMatch(/no subscription/)
    expect(
      limitsNotice(makeUnavailableLimits({ checkedAt: iso(0), reason: 'probeFailed', message: 'boom' }))
    ).toBe('boom')
    expect(limitsNotice(makeUsageLimits({ checkedAt: iso(0), windows: [] }))).toBe(
      'No limits reported.'
    )
    expect(
      limitsNotice(makeUsageLimits({ checkedAt: iso(0), windows: [win({ id: 'a' })] }))
    ).toBeNull()
  })

  it('worst remaining', () => {
    expect(worstRemainingPercent([])).toBeNull()
    expect(
      worstRemainingPercent([win({ id: 'a', usedPercent: 10 }), win({ id: 'b', usedPercent: 80 })])
    ).toBe(20)
  })
})
