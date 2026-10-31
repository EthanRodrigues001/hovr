import { describe, expect, it } from 'vitest'
import { parseCursorEvents } from '../electron/main/history/cursorEvents'

/** Shaped like a real GetFilteredUsageEvents response. */
const page = {
  totalUsageEventsCount: 2,
  usageEventsDisplay: [
    {
      timestamp: '1793434629684',
      model: 'default',
      kind: 'USAGE_EVENT_KIND_CUSTOM_SUBSCRIPTION',
      requestsCosts: 0.2,
      isTokenBasedCall: true,
      tokenUsage: { inputTokens: 40, outputTokens: 58, cacheReadTokens: 13568, totalCents: 0.7212 },
      usageEventId: 'a'
    },
    {
      timestamp: '1793434596208',
      model: 'default',
      isTokenBasedCall: true,
      tokenUsage: { inputTokens: 9637, outputTokens: 31, cacheReadTokens: 3968, totalCents: 2.1444 },
      usageEventId: 'b'
    }
  ]
}

describe('parseCursorEvents', () => {
  it('maps events to usage records with Cursor’s own cost', () => {
    const [a, b] = parseCursorEvents(page)
    expect(a).toMatchObject({ provider: 'cursor', model: 'default', input: 40, output: 58, cacheRead: 13568, cacheWrite: 0, dedupeKey: 'cursor:a' })
    expect(a.timestampMs).toBe(1793434629684)
    expect(a.reportedCostUsd).toBeCloseTo(0.007212, 6)
    expect(b.input).toBe(9637)
    expect(b.reportedCostUsd).toBeCloseTo(0.021444, 6)
  })

  it('returns nothing for an empty or unexpected body', () => {
    expect(parseCursorEvents({})).toEqual([])
    expect(parseCursorEvents(null)).toEqual([])
    expect(parseCursorEvents({ usageEventsDisplay: [{ model: 'x' }] })).toEqual([])
  })
})
