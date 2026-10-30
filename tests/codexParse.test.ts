import { describe, expect, it } from 'vitest'
import { codexPlanLabel, parseCodexUsage } from '../electron/main/providers/codexParse'

const AT = '2026-10-30T12:00:00.000Z'

describe('parseCodexUsage', () => {
  it('free plan: single monthly primary window (live response shape)', () => {
    const out = parseCodexUsage(
      {
        email: 'a@b.c',
        plan_type: 'free',
        rate_limit: {
          primary_window: { used_percent: 52, limit_window_seconds: 2592000, reset_at: 1795017359 },
          secondary_window: null
        },
        additional_rate_limits: null,
        credits: { has_credits: false }
      },
      AT
    )
    expect(out.account).toBe('a@b.c')
    expect(out.plan).toBe('Free')
    expect(out.windows).toHaveLength(1)
    expect(out.windows[0]).toMatchObject({
      id: 'primary',
      kind: 'monthly',
      label: 'Monthly',
      usedPercent: 52,
      windowDurationMins: 43200,
      resetsAt: new Date(1795017359 * 1000).toISOString()
    })
  })

  it('paid plan: 5h session + weekly', () => {
    const out = parseCodexUsage(
      {
        plan_type: 'plus',
        rate_limit: {
          primary_window: { used_percent: 10, limit_window_seconds: 18000, reset_at: 1795000000 },
          secondary_window: { used_percent: 60, limit_window_seconds: 604800, reset_at: 1795500000 }
        }
      },
      AT
    )
    expect(out.windows.map((w) => [w.id, w.kind, w.usedPercent])).toEqual([
      ['primary', 'session', 10],
      ['secondary', 'weekly', 60]
    ])
  })

  it('falls back to plan-based durations when the server omits them', () => {
    const paid = parseCodexUsage({ plan_type: 'pro', rate_limit: { primary_window: { used_percent: 1 }, secondary_window: { used_percent: 2 } } }, AT)
    expect(paid.windows.map((w) => w.kind)).toEqual(['session', 'weekly'])
    const go = parseCodexUsage({ plan_type: 'go', rate_limit: { primary_window: { used_percent: 1 } } }, AT)
    expect(go.windows[0].kind).toBe('monthly')
    expect(go.windows[0].resetsAt).toBeUndefined()
  })

  it('clamps and skips malformed windows', () => {
    const out = parseCodexUsage(
      { plan_type: 'plus', rate_limit: { primary_window: { used_percent: 140 }, secondary_window: { used_percent: 'x' } } },
      AT
    )
    expect(out.windows).toHaveLength(1)
    expect(out.windows[0].usedPercent).toBe(100)
  })

  it('no windows => unsupported (keeps account/plan); junk => probeFailed', () => {
    const none = parseCodexUsage({ plan_type: 'enterprise', email: 'x@y.z', rate_limit: null }, AT)
    expect(none.unavailable?.reason).toBe('unsupported')
    expect(none.plan).toBe('Enterprise')
    expect(parseCodexUsage([], AT).unavailable?.reason).toBe('probeFailed')
  })

  it('plan label', () => {
    expect(codexPlanLabel('team')).toBe('Team')
    expect(codexPlanLabel('')).toBeUndefined()
    expect(codexPlanLabel(3)).toBeUndefined()
  })
})
