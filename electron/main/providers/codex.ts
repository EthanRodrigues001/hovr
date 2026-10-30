/**
 * Codex driver.
 *
 * Reads the ChatGPT access token Codex stored in `<CODEX_HOME or ~/.codex>/auth.json`
 * and calls the same endpoint Codex's usage screen uses. The endpoint is undocumented,
 * so every failure degrades to `probeFailed` (keep last good bars).
 *
 * The token never leaves this module and is never logged. hovr does not refresh it;
 * Codex owns the refresh token, so an expired token just means "run Codex once".
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { UsageLimits } from '../../../shared/usage'
import { makeUnavailableLimits } from '../../../shared/usageMath'
import { parseCodexUsage } from './codexParse'
import type { ProviderDriver } from './types'
import { exists, expandHome, findOnPath, isRecord, readJsonFile, requestJson } from './util'

const USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage'

function codexHome(env: NodeJS.ProcessEnv): string {
  const raw = env.CODEX_HOME?.trim()
  return raw ? expandHome(raw) : join(homedir(), '.codex')
}

type AuthRead = { token: string; accountId?: string } | { apiKey: true } | { missing: true }

async function readAuth(env: NodeJS.ProcessEnv): Promise<AuthRead> {
  const auth = await readJsonFile(join(codexHome(env), 'auth.json'))
  if (!isRecord(auth)) return { missing: true }
  const tokens = isRecord(auth.tokens) ? auth.tokens : undefined
  const token = typeof tokens?.access_token === 'string' ? tokens.access_token.trim() : ''
  if (token) {
    const accountId = typeof tokens?.account_id === 'string' ? tokens.account_id.trim() : ''
    return { token, ...(accountId ? { accountId } : {}) }
  }
  // Logged in with an API key: billed per token, there are no subscription limits.
  return auth.auth_mode === 'apikey' ? { apiKey: true } : { missing: true }
}

export async function readCodexUsage(env: NodeJS.ProcessEnv = process.env): Promise<UsageLimits> {
  const auth = await readAuth(env)
  const checkedAt = new Date().toISOString()
  if ('missing' in auth) {
    return makeUnavailableLimits({ checkedAt, reason: 'unsupported', message: 'Not signed in to Codex.' })
  }
  if ('apiKey' in auth) {
    return makeUnavailableLimits({
      checkedAt,
      reason: 'unsupported',
      message: 'Codex is using an API key, which has no subscription limits.'
    })
  }
  const res = await requestJson({
    url: USAGE_URL,
    headers: {
      authorization: `Bearer ${auth.token}`,
      'OpenAI-Beta': 'codex-1',
      Originator: 'Codex Desktop',
      ...(auth.accountId ? { 'Chatgpt-Account-Id': auth.accountId } : {})
    },
    label: 'Codex',
    authHint: 'Run Codex once to refresh it.'
  })
  return res.ok ? parseCodexUsage(res.json, new Date().toISOString()) : res.limits
}

export const codexDriver: ProviderDriver = {
  id: 'codex',
  label: 'Codex',
  supportsLimits: true,
  async detect(env = process.env) {
    const installed = (await findOnPath(['codex'], env)) !== undefined || (await exists(codexHome(env)))
    const auth = await readAuth(env)
    const authenticated = !('missing' in auth)
    return {
      installed,
      authState: authenticated ? 'authenticated' : installed ? 'unauthenticated' : 'unknown',
      ...(installed && !authenticated ? { hint: 'Run `codex login`.' } : {})
    }
  },
  read: readCodexUsage
}
