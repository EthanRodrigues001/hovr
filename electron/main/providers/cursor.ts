/**
 * Cursor driver.
 *
 * Token sources, first hit wins:
 *   1. `CURSOR_AUTH_TOKEN` env var;
 *   2. the Cursor CLI login: `%APPDATA%\Cursor\auth.json` -> `accessToken`
 *      (macOS `~/.cursor`, Linux `$XDG_CONFIG_HOME/cursor`) - same file T3 reads;
 *   3. the Cursor *IDE* login stored in `User/globalStorage/state.vscdb`.
 *
 * (3) is hovr's own addition. The file is SQLite; Electron's bundled Node has no
 * SQLite binding, so the token is located by scanning the raw bytes for the
 * `cursorAuth/accessToken` key followed by a JWT, then picking the one that
 * expires last. Read-only; the token is only sent to api2.cursor.sh.
 *
 * An explicit `CURSOR_API_KEY` names a different account than the stored login,
 * so it disables limits (as T3 does). macOS Keychain logins are not read.
 */
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { UsageLimits } from '../../../shared/usage'
import { makeUnavailableLimits } from '../../../shared/usageMath'
import { parseCursorUsage } from './cursorParse'
import type { ProviderDriver } from './types'
import { exists, findOnPath, isRecord, readJsonFile, requestJson } from './util'

const DEFAULT_ENDPOINT = 'https://api2.cursor.sh'
const TOKEN_KEY = Buffer.from('cursorAuth/accessToken')
const JWT_AT_START = /^[^e]{0,8}?(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/

function appDir(env: NodeJS.ProcessEnv): string {
  const home = env.USERPROFILE || env.HOME || homedir()
  if (process.platform === 'win32') return join(env.APPDATA || join(home, 'AppData', 'Roaming'), 'Cursor')
  if (process.platform === 'darwin') return join(home, 'Library', 'Application Support', 'Cursor')
  return join(env.XDG_CONFIG_HOME || join(home, '.config'), 'cursor')
}

/** Directory holding the CLI's auth.json (differs from the IDE's app dir on macOS). */
function cliDir(env: NodeJS.ProcessEnv): string {
  const home = env.USERPROFILE || env.HOME || homedir()
  return process.platform === 'darwin' ? join(home, '.cursor') : appDir(env)
}

function jwtExpiry(jwt: string): number | undefined {
  try {
    const claims: unknown = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'))
    return isRecord(claims) && typeof claims.exp === 'number' ? claims.exp : undefined
  } catch {
    return undefined
  }
}

/**
 * Finds the newest access-token JWT stored under `cursorAuth/accessToken` in raw
 * SQLite bytes. Exported for tests. Freed pages can hold older tokens, hence "newest".
 */
export function extractCursorIdeToken(db: Buffer): string | undefined {
  let best: { jwt: string; exp: number } | undefined
  let at = 0
  while ((at = db.indexOf(TOKEN_KEY, at)) !== -1) {
    const tail = db.subarray(at + TOKEN_KEY.length, at + TOKEN_KEY.length + 4096).toString('latin1')
    const jwt = JWT_AT_START.exec(tail)?.[1]
    const exp = jwt ? jwtExpiry(jwt) : undefined
    if (jwt && exp !== undefined && (!best || exp > best.exp)) best = { jwt, exp }
    at += TOKEN_KEY.length
  }
  return best?.jwt
}

type TokenRead = { token: string; source: 'env' | 'cli' | 'ide' } | { apiKeyOnly: true } | { missing: true }

export async function readCursorToken(env: NodeJS.ProcessEnv): Promise<TokenRead> {
  const fromEnv = env.CURSOR_AUTH_TOKEN?.trim()
  if (fromEnv) return { token: fromEnv, source: 'env' }
  if (env.CURSOR_API_KEY?.trim()) return { apiKeyOnly: true }

  const cli = await readJsonFile(join(cliDir(env), 'auth.json'))
  const cliToken = isRecord(cli) && typeof cli.accessToken === 'string' ? cli.accessToken.trim() : ''
  if (cliToken) return { token: cliToken, source: 'cli' }

  try {
    const ide = extractCursorIdeToken(await readFile(join(appDir(env), 'User', 'globalStorage', 'state.vscdb')))
    if (ide) return { token: ide, source: 'ide' }
  } catch {
    /* no IDE install */
  }
  return { missing: true }
}

export async function readCursorUsage(env: NodeJS.ProcessEnv = process.env): Promise<UsageLimits> {
  const checkedAt = new Date().toISOString()
  const auth = await readCursorToken(env)
  if ('apiKeyOnly' in auth) {
    return makeUnavailableLimits({
      checkedAt,
      reason: 'unsupported',
      message: 'Cursor is using an API key, which has no plan limits.'
    })
  }
  if ('missing' in auth) {
    return makeUnavailableLimits({ checkedAt, reason: 'unsupported', message: 'Not signed in to Cursor.' })
  }
  const endpoint = (env.CURSOR_API_ENDPOINT?.trim() || DEFAULT_ENDPOINT).replace(/\/$/, '')
  const res = await requestJson({
    url: `${endpoint}/aiserver.v1.DashboardService/GetCurrentPeriodUsage`,
    method: 'POST',
    headers: {
      authorization: `Bearer ${auth.token}`,
      'connect-protocol-version': '1',
      'x-cursor-client-type': 'cli'
    },
    body: {},
    label: 'Cursor',
    authHint: 'Open Cursor (or run `cursor-agent login`) to refresh it.'
  })
  return res.ok ? parseCursorUsage(res.json, new Date().toISOString()) : res.limits
}

export const cursorDriver: ProviderDriver = {
  id: 'cursor',
  label: 'Cursor',
  supportsLimits: true,
  async detect(env = process.env) {
    const installed =
      (await findOnPath(['cursor-agent', 'cursor'], env)) !== undefined || (await exists(appDir(env)))
    const auth = await readCursorToken(env)
    const authenticated = !('missing' in auth) && !('apiKeyOnly' in auth)
    return {
      installed,
      authState: authenticated ? 'authenticated' : installed ? 'unauthenticated' : 'unknown',
      ...(installed && !authenticated ? { hint: 'Sign in to Cursor or run `cursor-agent login`.' } : {})
    }
  },
  read: readCursorUsage
}
