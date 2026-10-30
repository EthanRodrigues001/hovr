import { describe, expect, it } from 'vitest'
import { sanitize } from '../shared/settingsSanitize'
import { DEFAULT_SETTINGS } from '../shared/types'

const base = { ...DEFAULT_SETTINGS }

describe('sanitize', () => {
  it('drops the old Edge-Drop keys and keeps valid known ones', () => {
    const legacy = {
      hotZoneHeight: 0.6,
      stickPosition: 'left',
      historyLimit: 500,
      uiStyle: 'modern',
      soundEffects: true,
      launchAtLogin: false,
      suppressInFullscreen: false,
      stickDisplayId: 7
    }
    const out = sanitize(base, legacy as never)
    expect(Object.keys(out).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort())
    expect(out).toMatchObject({ launchAtLogin: false, suppressInFullscreen: false, stickDisplayId: 7 })
  })

  it('falls back to the base value for wrong types', () => {
    const out = sanitize(base, { launchAtLogin: 'yes', reduceMotion: 1, collapsedStyle: 'huge', disabledProviders: [1, 2] } as never)
    expect(out.launchAtLogin).toBe(base.launchAtLogin)
    expect(out.reduceMotion).toBe(base.reduceMotion)
    expect(out.collapsedStyle).toBe('chips')
    expect(out.disabledProviders).toEqual([])
  })

  it('maps the old "dots" pill style to "compact"', () => {
    expect(sanitize(base, { collapsedStyle: 'dots' as never }).collapsedStyle).toBe('compact')
    expect(sanitize(base, { collapsedStyle: 'compact' }).collapsedStyle).toBe('compact')
  })

  it('clamps and rounds the refresh interval', () => {
    expect(sanitize(base, { usageRefreshMinutes: 0 }).usageRefreshMinutes).toBe(1)
    expect(sanitize(base, { usageRefreshMinutes: 500 }).usageRefreshMinutes).toBe(60)
    expect(sanitize(base, { usageRefreshMinutes: 7.6 }).usageRefreshMinutes).toBe(8)
    expect(sanitize(base, { usageRefreshMinutes: NaN as never }).usageRefreshMinutes).toBe(5)
  })

  it('a patch layers over the current settings without resetting the rest', () => {
    const current = sanitize(base, { collapsedStyle: 'compact', usageRefreshMinutes: 15 })
    const next = sanitize(current, { reduceMotion: true })
    expect(next).toMatchObject({ collapsedStyle: 'compact', usageRefreshMinutes: 15, reduceMotion: true })
  })

  it('an explicit undefined display clears the saved fingerprint; a bad one is rejected', () => {
    const saved = sanitize(base, {
      stickDisplayId: 3,
      stickDisplayWorkArea: { x: 0, y: 0, width: 1920, height: 1080 },
      stickDisplayScaleFactor: 1.5
    })
    expect(saved.stickDisplayWorkArea).toEqual({ x: 0, y: 0, width: 1920, height: 1080 })
    const cleared = sanitize(saved, { stickDisplayId: undefined, stickDisplayWorkArea: undefined, stickDisplayScaleFactor: undefined })
    expect(cleared.stickDisplayId).toBeUndefined()
    expect(cleared.stickDisplayWorkArea).toBeUndefined()
    const bad = sanitize(saved, { stickDisplayWorkArea: { x: 'a' } as never })
    expect(bad.stickDisplayWorkArea).toBeUndefined()
  })

  it('a missing key keeps the base value (patches do not clear things by omission)', () => {
    const saved = sanitize(base, { stickDisplayId: 3 })
    expect(sanitize(saved, { reduceMotion: true }).stickDisplayId).toBe(3)
  })
})
