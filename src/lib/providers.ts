/**
 * Renderer-side presentation metadata per provider: short name, brand accent,
 * and a one-letter glyph for the ring. Purely cosmetic; data comes from main.
 */
import type { ProviderId } from '../../shared/usage'

export interface ProviderMeta {
  short: string
  accent: string
  glyph: string
}

export const PROVIDER_META: Record<ProviderId, ProviderMeta> = {
  claude: { short: 'Claude', accent: '#d97757', glyph: 'C' },
  codex: { short: 'Codex', accent: '#10a37f', glyph: 'X' },
  cursor: { short: 'Cursor', accent: '#e6e6e6', glyph: 'C' },
  antigravity: { short: 'Antigravity', accent: '#5b9dff', glyph: 'A' },
  grok: { short: 'Grok', accent: '#f4f4f4', glyph: 'G' },
  opencode: { short: 'OpenCode', accent: '#9b8cff', glyph: 'O' },
  muse: { short: 'Muse', accent: '#c084fc', glyph: 'M' },
  pi: { short: 'Pi', accent: '#fbbf24', glyph: 'π' },
  fx: { short: 'Fx', accent: '#34d399', glyph: 'F' },
  devin: { short: 'Devin', accent: '#60a5fa', glyph: 'D' },
  droid: { short: 'Droid', accent: '#f87171', glyph: 'D' },
  copilot: { short: 'Copilot', accent: '#a78bfa', glyph: 'C' },
  gemini: { short: 'Gemini', accent: '#7aa7ff', glyph: 'G' }
}

/** Colour for a "remaining %" value: comfortable, getting low, nearly out. */
export function remainingTone(remaining: number): 'ok' | 'low' | 'critical' {
  if (remaining <= 10) return 'critical'
  if (remaining <= 30) return 'low'
  return 'ok'
}

/** What each driver reads and where it talks, shown in Settings so nothing is hidden. */
export const PROVIDER_SOURCE: Record<ProviderId, string> = {
  claude: 'Reads the login in ~/.claude/.credentials.json and asks api.anthropic.com for your limits.',
  codex: 'Reads the login in ~/.codex/auth.json and asks chatgpt.com for your limits.',
  cursor: 'Uses the Cursor CLI or IDE login and asks api2.cursor.sh for your plan usage.',
  antigravity: 'Reuses an existing Antigravity Google login (T3 Code or Gemini CLI) and asks Google Cloud Code for quotas.',
  grok: 'Reads the login in ~/.grok/auth.json and asks cli-chat-proxy.grok.com for your credits.',
  opencode: 'Uses the OpenCode Go key in auth.json and asks opencode.ai for Go plan usage.',
  muse: 'Detected on this PC only. Muse reports limits during live turns, so there is nothing to read.',
  pi: 'Detected on this PC only. Pi has no usage-limit source.',
  fx: 'Detected on this PC only. No usage-limit source is known.',
  devin: 'Detected on this PC only. No usage-limit source is known.',
  droid: 'Detected on this PC only. No usage-limit source is known.',
  copilot: 'Detected on this PC only. No usage-limit source is known.',
  gemini: 'Detected on this PC only. No usage-limit source is known.'
}
