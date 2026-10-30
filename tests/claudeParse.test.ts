import { describe, expect, it } from 'vitest'
import { parseClaudeUsage } from '../electron/main/providers/claudeParse'

const AT = '2026-10-30T12:00:00.000Z'

describe('parseClaudeUsage', () => {
  it('maps the live response shape (session + weekly, unknown keys ignored)', () => {
    const out = parseClaudeUsage(
      {
        five_hour: { utilization: 28.0, resets_at: '2026-10-30T17:20:00.203072+00:00', limit_dollars: null },
        seven_day: { utilization: 22.0, resets_at: '2026-11-04T10:00:00.203098+00:00' },
        seven_day_opus: null,
        iguana_necktie: { utilization: 0, resets_at: 'x' },
        extra_usage: { is_enabled: false, monthly_limit: null },
        limits: [{ kind: 'session', percent: 28 }, { kind: 'weekly_all', percent: 22 }]
      },
      AT
    )
    expect(out.unavailable).toBeUndefined()
    expect(out.windows.map((w) => [w.id, w.kind, w.usedPercent, w.windowDurationMins])).toEqual([
      ['five_hour', 'session', 28, 300],
      ['seven_day', 'weekly', 22, 10080]
    ])
    expect(out.windows[0].resetsAt).toBe('2026-10-30T17:20:00.203Z')
  })

  it('reads per-model weekly limits and dedupes against fixed keys', () => {
    const out = parseClaudeUsage(
      {
        seven_day: { utilization: 10, resets_at: null },
        limits: [
          { kind: 'weekly_scoped', percent: 40, resets_at: '2026-11-04T10:00:00Z', scope: { model: { display_name: 'Opus 4' } } },
          { kind: 'weekly_scoped', percent: 5, scope: { model: {} } }
        ]
      },
      AT
    )
    expect(out.windows.map((w) => w.id)).toEqual(['seven_day', 'seven_day_opus_4'])
    expect(out.windows[1].label).toBe('Weekly · Opus 4')
    expect(out.windows[0].resetsAt).toBeUndefined()
  })

  it('adds monthly spend only when extra usage is enabled with a cap', () => {
    const body = (extra: object) => parseClaudeUsage({ five_hour: { utilization: 1 }, extra_usage: extra }, AT)
    expect(body({ is_enabled: true, used_credits: 25, monthly_limit: 100 }).windows.find((w) => w.id === 'monthly_spend')?.usedPercent).toBe(25)
    expect(body({ is_enabled: false, used_credits: 25, monthly_limit: 100 }).windows.some((w) => w.id === 'monthly_spend')).toBe(false)
    expect(body({ is_enabled: true, used_credits: 25, monthly_limit: null, utilization: null }).windows.some((w) => w.id === 'monthly_spend')).toBe(false)
  })

  it('clamps out-of-range percentages', () => {
    expect(parseClaudeUsage({ five_hour: { utilization: 180 } }, AT).windows[0].usedPercent).toBe(100)
  })

  it('no recognisable windows => unsupported; junk => probeFailed', () => {
    expect(parseClaudeUsage({ five_hour: null, seven_day: null }, AT).unavailable?.reason).toBe('unsupported')
    expect(parseClaudeUsage('nope', AT).unavailable?.reason).toBe('probeFailed')
    expect(parseClaudeUsage(null, AT).unavailable?.reason).toBe('probeFailed')
  })
})
