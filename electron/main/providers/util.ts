/**
 * Small I/O helpers shared by provider drivers. No provider-specific knowledge.
 */
import { access, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'
import type { UsageLimits } from '../../../shared/usage'
import { makeUnavailableLimits } from '../../../shared/usageMath'

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Parsed JSON file, or undefined when missing / unreadable / not JSON. */
export async function readJsonFile(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return undefined
  }
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Expand a leading `~` the way a shell would (some CLIs reject a literal one). */
export function expandHome(raw: string): string {
  if (raw === '~') return homedir()
  return raw.startsWith('~/') || raw.startsWith('~\\') ? join(homedir(), raw.slice(2)) : raw
}

/**
 * Looks for an executable on PATH without spawning anything. On Windows it tries
 * each PATHEXT suffix. Returns the first match.
 */
export async function findOnPath(
  names: readonly string[],
  env: NodeJS.ProcessEnv = process.env
): Promise<string | undefined> {
  const dirs = (env.PATH ?? env.Path ?? '').split(delimiter).filter(Boolean)
  const exts =
    process.platform === 'win32' ? ['', ...(env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM').split(';').filter(Boolean)] : ['']
  for (const dir of dirs) {
    for (const name of names) {
      for (const ext of exts) {
        const candidate = join(dir, name + ext.toLowerCase())
        if (await exists(candidate)) return candidate
      }
    }
  }
  return undefined
}

export type HttpResult =
  | { ok: true; status: number; json: unknown }
  | { ok: false; limits: UsageLimits }

/**
 * One JSON request with a timeout. Every failure is mapped to a `probeFailed`
 * snapshot (`message` never contains response bodies or tokens), so callers can
 * `return result.limits` directly.
 */
export async function requestJson(input: {
  url: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
  /** Name used in messages, e.g. "Cursor". */
  label: string
  /** Hint appended to 401/403, e.g. "Sign in again with `cursor-agent login`." */
  authHint: string
  /** Map specific statuses to `unsupported` instead of `probeFailed` (e.g. 403 = no plan). */
  unsupportedStatuses?: readonly number[]
}): Promise<HttpResult> {
  const checkedAt = new Date().toISOString()
  const fail = (message: string, reason: 'probeFailed' | 'unsupported' = 'probeFailed'): HttpResult => ({
    ok: false,
    limits: makeUnavailableLimits({ checkedAt, reason, message })
  })
  try {
    const res = await fetch(input.url, {
      method: input.method ?? 'GET',
      headers: {
        ...(input.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...input.headers
      },
      ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(input.timeoutMs ?? 10_000)
    })
    if (input.unsupportedStatuses?.includes(res.status)) {
      return fail(`${input.label} has no usage limits for this account.`, 'unsupported')
    }
    if (res.status === 401 || res.status === 403) return fail(`${input.label} token expired. ${input.authHint}`)
    if (res.status === 429) return fail('Rate limited. Retrying later.')
    if (!res.ok) return fail(`${input.label} usage request failed (${res.status}).`)
    return { ok: true, status: res.status, json: await res.json() }
  } catch {
    return fail(`Could not reach ${input.label} usage.`)
  }
}
