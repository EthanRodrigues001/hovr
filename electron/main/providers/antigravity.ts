/**
 * Antigravity driver.
 *
 * Antigravity's quota API needs a Google OAuth token. hovr does not run its own
 * sign-in; it reuses an `acp_token.json` that another tool already created
 * (`{client_id, client_secret, refresh_token, project_id?}`), the same file T3 Code
 * keeps for its Antigravity provider. Searched in:
 *   - `<ANTIGRAVITY_ACP_TOKEN>` env (explicit path),
 *   - `~/.gemini/antigravity-acp/acp_token.json`,
 *   - `~/.t3/userdata/providers/antigravity/<hash>/antigravity-acp/acp_token.json`
 *     (T3 Code's managed profile; newest wins).
 * The Antigravity IDE keeps its own login in a private protobuf blob, which is
 * deliberately not read.
 *
 * Google's refresh grant does not rotate the refresh token, so refreshing an access
 * token here does not log the owning tool out. The access token is cached in memory
 * only and never written anywhere.
 */
import { readdir, stat } from 'node:fs/promises'
import { arch, homedir, platform } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import type { UsageLimits } from '../../../shared/usage'
import { makeUnavailableLimits, makeUsageLimits } from '../../../shared/usageMath'
import { mergeWindowsByMaxUsed, parseAvailableModels, parseQuotaSummary } from './antigravityParse'
import type { ProviderDriver } from './types'
import { exists, findOnPath, isRecord, readJsonFile } from './util'

const ENDPOINTS = ['https://daily-cloudcode-pa.googleapis.com', 'https://cloudcode-pa.googleapis.com']
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const TIMEOUT_MS = 10_000

interface TokenFile {
  client_id: string
  client_secret: string
  refresh_token: string
  project_id?: string
}

async function newest(paths: string[]): Promise<string | undefined> {
  let best: { path: string; mtime: number } | undefined
  for (const path of paths) {
    try {
      const mtime = (await stat(path)).mtimeMs
      if (!best || mtime > best.mtime) best = { path, mtime }
    } catch {
      /* missing */
    }
  }
  return best?.path
}

async function findTokenFile(env: NodeJS.ProcessEnv): Promise<string | undefined> {
  const explicit = env.ANTIGRAVITY_ACP_TOKEN?.trim()
  if (explicit) return (await exists(explicit)) ? explicit : undefined
  const home = env.USERPROFILE || env.HOME || homedir()
  const candidates = [join(home, '.gemini', 'antigravity-acp', 'acp_token.json')]
  const t3Root = join(home, '.t3', 'userdata', 'providers', 'antigravity')
  try {
    for (const entry of await readdir(t3Root)) {
      candidates.push(join(t3Root, entry, 'antigravity-acp', 'acp_token.json'))
    }
  } catch {
    /* no T3 profile */
  }
  return newest(candidates)
}

async function readTokenFile(path: string): Promise<TokenFile | undefined> {
  const raw = await readJsonFile(path)
  if (!isRecord(raw)) return undefined
  const { client_id: id, client_secret: secret, refresh_token: refresh, project_id: project } = raw
  if (typeof id !== 'string' || !id || typeof secret !== 'string' || !secret) return undefined
  if (typeof refresh !== 'string' || !refresh) return undefined
  return {
    client_id: id,
    client_secret: secret,
    refresh_token: refresh,
    ...(typeof project === 'string' && project ? { project_id: project } : {})
  }
}

// In-memory access-token cache, keyed by a fingerprint of the credential file.
let cached: { fingerprint: string; accessToken: string; expiresAt: number } | undefined

async function accessTokenFor(token: TokenFile): Promise<string | undefined> {
  const fingerprint = createHash('sha256')
    .update(`${token.client_id}\0${token.refresh_token}\0${token.project_id ?? ''}`)
    .digest('hex')
  if (cached && cached.fingerprint === fingerprint && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken
  }
  cached = undefined
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: token.client_id,
        client_secret: token.client_secret,
        refresh_token: token.refresh_token,
        grant_type: 'refresh_token'
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    if (!res.ok) return undefined
    const body: unknown = await res.json()
    if (!isRecord(body) || typeof body.access_token !== 'string' || typeof body.expires_in !== 'number') return undefined
    cached = { fingerprint, accessToken: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 }
    return cached.accessToken
  } catch {
    return undefined
  }
}

async function callOperation(operation: string, accessToken: string, project: string | undefined): Promise<unknown[]> {
  const results = await Promise.all(
    ENDPOINTS.map(async (endpoint) => {
      try {
        const res = await fetch(`${endpoint}/v1internal:${operation}`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
            'user-agent': `antigravity/hub/1.0.0 (aidev_client; os_type=${platform()}; arch=${arch()}; cl=963137146)`
          },
          body: JSON.stringify(project ? { project } : {}),
          redirect: 'error',
          signal: AbortSignal.timeout(TIMEOUT_MS)
        })
        return res.ok ? await res.json() : undefined
      } catch {
        return undefined
      }
    })
  )
  return results.filter((r) => r !== undefined)
}

export async function readAntigravityUsage(env: NodeJS.ProcessEnv = process.env): Promise<UsageLimits> {
  const checkedAt = new Date().toISOString()
  const file = await findTokenFile(env)
  const token = file ? await readTokenFile(file) : undefined
  if (!token) {
    return makeUnavailableLimits({
      checkedAt,
      reason: 'unsupported',
      message: 'No Antigravity login found. Sign in to Antigravity from T3 Code or the Gemini CLI.'
    })
  }
  const accessToken = await accessTokenFor(token)
  if (!accessToken) {
    return makeUnavailableLimits({
      checkedAt,
      reason: 'probeFailed',
      message: 'Could not refresh the Antigravity login. Sign in again.'
    })
  }
  let windows = mergeWindowsByMaxUsed((await callOperation('retrieveUserQuotaSummary', accessToken, token.project_id)).flatMap(parseQuotaSummary))
  if (windows.length === 0) {
    windows = mergeWindowsByMaxUsed((await callOperation('fetchAvailableModels', accessToken, token.project_id)).flatMap(parseAvailableModels))
  }
  if (windows.length === 0) {
    return makeUnavailableLimits({
      checkedAt,
      reason: 'probeFailed',
      message: 'Antigravity did not return usable quota information.'
    })
  }
  return makeUsageLimits({ checkedAt: new Date().toISOString(), windows })
}

export const antigravityDriver: ProviderDriver = {
  id: 'antigravity',
  label: 'Antigravity',
  supportsLimits: true,
  async detect(env = process.env) {
    const home = env.USERPROFILE || env.HOME || homedir()
    const installed =
      (await findOnPath(['agy', 'antigravity'], env)) !== undefined ||
      (await exists(join(home, '.antigravity'))) ||
      (await exists(join(home, '.gemini', 'antigravity')))
    const hasLogin = (await findTokenFile(env)) !== undefined
    return {
      installed,
      authState: hasLogin ? 'authenticated' : installed ? 'unauthenticated' : 'unknown',
      ...(installed && !hasLogin
        ? { hint: 'Limits need a Google login that hovr can reuse (T3 Code or Gemini CLI).' }
        : {})
    }
  },
  read: readAntigravityUsage
}
