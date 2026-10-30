/**
 * Detect-only drivers: tools T3 Code can drive but for which no usage-limit source
 * is known (Muse's limits only arrive on live turns; Pi reports token history only;
 * the ACP agents and Fx have no reader). They show up as "Detected" so the list is
 * honest about what is installed, and never display made-up numbers.
 *
 * Binary names come from T3's driver defaults (`fx`) or the agent id; they are
 * detection hints only. Config-dir hints are best effort.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ProviderId } from '../../../shared/usage'
import { makeUnavailableLimits } from '../../../shared/usageMath'
import type { ProviderDriver } from './types'
import { exists, findOnPath } from './util'

function detectOnly(input: {
  id: ProviderId
  label: string
  binaries: string[]
  /** Directories under the home folder whose presence implies an install. */
  homeDirs?: string[]
  note: string
}): ProviderDriver {
  return {
    id: input.id,
    label: input.label,
    supportsLimits: false,
    async detect(env = process.env) {
      const home = env.USERPROFILE || env.HOME || homedir()
      let installed = (await findOnPath(input.binaries, env)) !== undefined
      for (const dir of input.homeDirs ?? []) installed ||= await exists(join(home, dir))
      return { installed, authState: 'unknown', ...(installed ? { hint: input.note } : {}) }
    },
    async read() {
      return makeUnavailableLimits({
        checkedAt: new Date().toISOString(),
        reason: 'unsupported',
        message: input.note
      })
    }
  }
}

export const detectOnlyDrivers: ProviderDriver[] = [
  detectOnly({
    id: 'muse',
    label: 'Muse',
    binaries: ['muse'],
    homeDirs: ['.muse'],
    note: 'Muse reports limits only during live turns, so hovr cannot show them yet.'
  }),
  detectOnly({
    id: 'pi',
    label: 'Pi',
    binaries: ['pi'],
    homeDirs: ['.pi'],
    note: 'Pi has no usage-limit source; only token history is available.'
  }),
  detectOnly({ id: 'fx', label: 'Fx', binaries: ['fx'], note: 'No usage-limit source is known for Fx.' }),
  detectOnly({ id: 'devin', label: 'Devin', binaries: ['devin'], note: 'No usage-limit source is known for Devin.' }),
  detectOnly({ id: 'droid', label: 'Droid', binaries: ['droid'], note: 'No usage-limit source is known for Droid.' }),
  detectOnly({
    id: 'copilot',
    label: 'GitHub Copilot',
    binaries: ['copilot'],
    note: 'No usage-limit source is known for Copilot.'
  }),
  detectOnly({
    id: 'gemini',
    label: 'Gemini CLI',
    binaries: ['gemini'],
    note: 'No usage-limit source is known for the Gemini CLI.'
  })
]
