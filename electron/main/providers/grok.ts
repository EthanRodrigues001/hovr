/**
 * Grok (xAI CLI) driver.
 *
 * Reads `<GROK_HOME or ~/.grok>/auth.json`. Like T3, it refuses to guess when the
 * environment or config points at a custom account/endpoint (those deployments
 * pick a different credential), and never picks an arbitrary account out of a
 * multi-account auth file. API-key logins have no subscription limits.
 */
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { UsageLimits } from '../../../shared/usage'
import { makeUnavailableLimits } from '../../../shared/usageMath'
import { parseGrokUsage } from './grokParse'
import type { ProviderDriver } from './types'
import { exists, expandHome, findOnPath, isRecord, readJsonFile, requestJson } from './util'

const BILLING_URL = 'https://cli-chat-proxy.grok.com/v1/billing?format=credits'
/** The only credential scopes T3 trusts; anything else may be another deployment. */
const CREDENTIAL_KEYS = ['https://auth.x.ai::b1a00492-073a-47ea-816f-4c329264a828', 'https://accounts.x.ai/sign-in']
const CUSTOM_ENV = [
  'XAI_API_KEY',
  'GROK_OIDC_ISSUER',
  'GROK_OIDC_CLIENT_ID',
  'GROK_OAUTH2_ISSUER',
  'GROK_OAUTH2_CLIENT_ID',
  'GROK_OAUTH2_PRINCIPAL_TYPE',
  'GROK_OAUTH2_PRINCIPAL_ID',
  'GROK_AUTH_PROVIDER_COMMAND',
  'GROK_LOCAL_AUTH',
  'GROK_CLI_CHAT_PROXY_BASE_URL',
  'GROK_MODELS_BASE_URL',
  'GROK_CONFIG',
  'GROK_CONFIG_PATH'
]
/** Config sections that can change the account or endpoint. */
const CUSTOM_CONFIG = /^\s*(?:\[\[?\s*)?["']?(?:auth|grok_com_config|endpoints)["']?\s*[.\]=]/m

function grokHome(env: NodeJS.ProcessEnv): string {
  const raw = env.GROK_HOME?.trim()
  return raw ? expandHome(raw) : join(homedir(), '.grok')
}

type Cred = { token: string; email?: string } | { custom: true } | { apiKey: true } | { missing: true }

async function readCredential(env: NodeJS.ProcessEnv): Promise<Cred> {
  if (CUSTOM_ENV.some((name) => env[name]?.trim())) return { custom: true }
  const home = grokHome(env)
  for (const file of ['config.toml', 'managed_config.toml', 'requirements.toml']) {
    try {
      if (CUSTOM_CONFIG.test(await readFile(join(home, file), 'utf8'))) return { custom: true }
    } catch {
      /* absent */
    }
  }
  const raw = env.GROK_AUTH?.trim()
  let auth: unknown
  if (raw) {
    try {
      auth = JSON.parse(raw)
    } catch {
      auth = undefined
    }
  } else {
    auth = await readJsonFile(join(home, 'auth.json'))
  }
  if (!isRecord(auth)) return { missing: true }
  const entry = CREDENTIAL_KEYS.map((k) => auth[k]).find(isRecord)
  if (!entry) return { missing: true }
  if (entry.auth_mode === 'api_key') return { apiKey: true }
  const token = typeof entry.key === 'string' ? entry.key.trim() : ''
  if (!token) return { missing: true }
  const email = typeof entry.email === 'string' && entry.email.trim() ? entry.email.trim() : undefined
  return { token, ...(email ? { email } : {}) }
}

export async function readGrokUsage(env: NodeJS.ProcessEnv = process.env): Promise<UsageLimits> {
  const checkedAt = new Date().toISOString()
  const cred = await readCredential(env)
  if ('custom' in cred) {
    return makeUnavailableLimits({
      checkedAt,
      reason: 'unsupported',
      message: 'Grok uses a custom account or endpoint; limits are only shown for the default login.'
    })
  }
  if ('apiKey' in cred) {
    return makeUnavailableLimits({ checkedAt, reason: 'unsupported', message: 'Grok is using an API key.' })
  }
  if ('missing' in cred) {
    return makeUnavailableLimits({ checkedAt, reason: 'unsupported', message: 'Not signed in to Grok.' })
  }
  const res = await requestJson({
    url: BILLING_URL,
    headers: { authorization: `Bearer ${cred.token}` },
    label: 'Grok',
    authHint: 'Run `grok` once to refresh it.'
  })
  if (!res.ok) return res.limits
  const limits = parseGrokUsage(res.json, new Date().toISOString())
  return cred.email ? { ...limits, account: cred.email } : limits
}

export const grokDriver: ProviderDriver = {
  id: 'grok',
  label: 'Grok',
  supportsLimits: true,
  async detect(env = process.env) {
    const installed = (await findOnPath(['grok'], env)) !== undefined || (await exists(grokHome(env)))
    const cred = await readCredential(env)
    const authenticated = 'token' in cred
    return {
      installed,
      authState: authenticated ? 'authenticated' : installed ? 'unauthenticated' : 'unknown',
      ...(installed && !authenticated ? { hint: 'Run `grok` and sign in.' } : {})
    }
  },
  read: readGrokUsage
}
