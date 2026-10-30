/**
 * OpenCode driver (OpenCode Go plan limits only).
 *
 * Key sources: `OPENCODE_API_KEY` env or `<XDG_DATA_HOME or ~/.local/share>/opencode/auth.json`
 * -> `["opencode-go"].key`. OpenCode 2 can also store a Console key in `opencode.db`
 * (SQLite); that path needs a SQLite reader and is not supported yet, so such logins
 * show as "no Go key". Users on a self-hosted OpenCode server are left alone.
 *
 * Other providers stored in auth.json (e.g. an OpenAI OAuth login) are ignored.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { UsageLimits } from '../../../shared/usage'
import { makeUnavailableLimits } from '../../../shared/usageMath'
import { parseOpenCodeGoUsage } from './opencodeParse'
import type { ProviderDriver } from './types'
import { exists, findOnPath, isRecord, readJsonFile, requestJson } from './util'

const USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'

function dataDir(env: NodeJS.ProcessEnv): string {
  const base = env.XDG_DATA_HOME?.trim() || join(env.USERPROFILE || env.HOME || homedir(), '.local', 'share')
  return join(base, 'opencode')
}

async function readGoKey(env: NodeJS.ProcessEnv): Promise<string | undefined> {
  const auth = await readJsonFile(join(dataDir(env), 'auth.json'))
  const entry = isRecord(auth) ? auth['opencode-go'] : undefined
  const stored = isRecord(entry) && typeof entry.key === 'string' ? entry.key.trim() : ''
  return stored || env.OPENCODE_API_KEY?.trim() || undefined
}

export async function readOpenCodeUsage(env: NodeJS.ProcessEnv = process.env): Promise<UsageLimits> {
  const checkedAt = new Date().toISOString()
  const key = await readGoKey(env)
  if (!key) {
    return makeUnavailableLimits({
      checkedAt,
      reason: 'unsupported',
      message: 'No OpenCode Go key found; limits only exist on the Go plan.'
    })
  }
  const res = await requestJson({
    url: USAGE_URL,
    headers: { authorization: `Bearer ${key}` },
    label: 'OpenCode Go',
    authHint: 'Reconnect OpenCode Go.',
    // A valid Zen key can exist without a Go subscription.
    unsupportedStatuses: [403]
  })
  if (!res.ok) return res.limits
  return parseOpenCodeGoUsage(res.json, new Date().toISOString())
}

export const opencodeDriver: ProviderDriver = {
  id: 'opencode',
  label: 'OpenCode',
  supportsLimits: true,
  async detect(env = process.env) {
    const installed = (await findOnPath(['opencode'], env)) !== undefined || (await exists(dataDir(env)))
    const key = await readGoKey(env)
    return {
      installed,
      // Being signed in to other OpenCode providers does not mean Go limits exist.
      authState: key ? 'authenticated' : installed ? 'unauthenticated' : 'unknown',
      ...(installed && !key ? { hint: 'Limits are only available on the OpenCode Go plan.' } : {})
    }
  },
  read: readOpenCodeUsage
}
