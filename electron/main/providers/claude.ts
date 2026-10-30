/**
 * Claude Code driver.
 *
 * Reads the OAuth access token Claude Code already stored and calls the same
 * usage endpoint its `/usage` screen uses. The endpoint is undocumented, so every
 * failure degrades to `probeFailed` (keep last good bars) rather than throwing.
 *
 * The token never leaves this module: it is not logged, stored, or sent anywhere
 * but api.anthropic.com. hovr never refreshes it; Claude Code owns the refresh
 * token, so an expired token just means "open Claude Code once".
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { UsageLimits } from '../../../shared/usage'
import { makeUnavailableLimits } from '../../../shared/usageMath'
import { parseClaudeUsage } from './claudeParse'
import type { ProviderDriver } from './types'
import { exists, findOnPath, isRecord, readJsonFile, requestJson } from './util'

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage'
/** The endpoint can 429 without a Claude Code style user agent. */
const USER_AGENT = 'claude-cli/2.1.0 (external, cli)'

function configDir(env: NodeJS.ProcessEnv): string {
  return env.CLAUDE_CONFIG_DIR?.trim() || join(homedir(), '.claude')
}

type TokenRead = { token: string; plan?: string } | { missing: true }

async function readAccessToken(env: NodeJS.ProcessEnv): Promise<TokenRead> {
  const parsed = await readJsonFile(join(configDir(env), '.credentials.json'))
  const oauth = isRecord(parsed) && isRecord(parsed.claudeAiOauth) ? parsed.claudeAiOauth : undefined
  const token = typeof oauth?.accessToken === 'string' ? oauth.accessToken.trim() : ''
  if (!token) return { missing: true }
  const sub = typeof oauth?.subscriptionType === 'string' ? oauth.subscriptionType.trim() : ''
  const plan = sub ? sub.charAt(0).toUpperCase() + sub.slice(1) : undefined
  return { token, ...(plan ? { plan } : {}) }
}

export async function readClaudeUsage(env: NodeJS.ProcessEnv = process.env): Promise<UsageLimits> {
  const read = await readAccessToken(env)
  if ('missing' in read) {
    return makeUnavailableLimits({
      checkedAt: new Date().toISOString(),
      reason: 'unsupported',
      message: 'Not signed in to Claude Code.'
    })
  }
  const res = await requestJson({
    url: USAGE_URL,
    headers: {
      authorization: `Bearer ${read.token}`,
      'anthropic-beta': 'oauth-2025-04-20',
      'user-agent': USER_AGENT
    },
    label: 'Claude',
    authHint: 'Open Claude Code once to refresh it.'
  })
  if (!res.ok) return res.limits
  const limits = parseClaudeUsage(res.json, new Date().toISOString())
  return read.plan ? { ...limits, plan: read.plan } : limits
}

export const claudeDriver: ProviderDriver = {
  id: 'claude',
  label: 'Claude Code',
  supportsLimits: true,
  async detect(env = process.env) {
    const installed = (await findOnPath(['claude'], env)) !== undefined || (await exists(configDir(env)))
    const auth = await readAccessToken(env)
    const authenticated = !('missing' in auth)
    return {
      installed,
      authState: authenticated ? 'authenticated' : installed ? 'unauthenticated' : 'unknown',
      ...(installed && !authenticated ? { hint: 'Run `claude` and sign in.' } : {})
    }
  },
  read: readClaudeUsage
}
