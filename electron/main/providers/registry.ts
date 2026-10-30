/**
 * The list of provider drivers. Adding a tool = one driver file + one line here.
 * Order is display order (limit-capable tools first).
 */
import { antigravityDriver } from './antigravity'
import { claudeDriver } from './claude'
import { codexDriver } from './codex'
import { cursorDriver } from './cursor'
import { detectOnlyDrivers } from './detectOnly'
import { grokDriver } from './grok'
import { opencodeDriver } from './opencode'
import type { ProviderDriver } from './types'

export const DRIVERS: readonly ProviderDriver[] = [
  claudeDriver,
  codexDriver,
  cursorDriver,
  antigravityDriver,
  grokDriver,
  opencodeDriver,
  ...detectOnlyDrivers
]
