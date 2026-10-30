/**
 * Settings persistence.
 *
 * Settings are small (a single flat object) so a plain JSON file is plenty. Files
 * written by older versions (or by hand) are sanitised on load: unknown keys are
 * dropped and every field falls back to its default if missing or the wrong type.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { sanitize } from '../../shared/settingsSanitize'
import { DEFAULT_SETTINGS, type Settings } from '../../shared/types'
import { PATHS } from './paths'

let cache: Settings | null = null

export function loadSettings(): Settings {
  if (cache) return cache
  let file: Partial<Record<keyof Settings, unknown>> = {}
  try {
    if (existsSync(PATHS.settingsFile())) {
      const parsed: unknown = JSON.parse(readFileSync(PATHS.settingsFile(), 'utf8'))
      if (typeof parsed === 'object' && parsed !== null) file = parsed as typeof file
    }
  } catch {
    file = {}
  }
  cache = sanitize({ ...DEFAULT_SETTINGS }, file)
  return cache
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = sanitize(loadSettings(), patch)
  cache = next
  try {
    writeFileSync(PATHS.settingsFile(), JSON.stringify(next, null, 2), 'utf8')
  } catch {
    /* non-fatal; settings stay in memory */
  }
  return next
}

export function resetSettingsCache(): void {
  cache = null
}
