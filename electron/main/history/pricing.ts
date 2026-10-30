/**
 * Model price table (per-token rates), parsed from LiteLLM's public price list.
 * Pure parsing + lookup here; fetching and caching live in historyService.
 *
 * Models missing an input or output rate are dropped rather than priced at 0, so
 * a cost is never understated. Missing cache rates fall back to the input rate.
 */
export interface Rate {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export type RateTable = ReadonlyMap<string, Rate>

function finite(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null
}

function normalize(model: string): string {
  return model.trim().toLowerCase()
}

function bare(key: string): string {
  const slash = key.lastIndexOf('/')
  return slash === -1 ? key : key.slice(slash + 1)
}

/** Claude's bracketed context variants (e.g. `claude-opus-4-1[1m]`) price at the base tier. */
function stripVariant(key: string): string {
  const bracket = key.indexOf('[')
  return bracket === -1 ? key : key.slice(0, bracket)
}

/** Bare family names are generation-ambiguous; synthetic messages are unbilled. */
const UNPRICEABLE = new Set(['<synthetic>', 'synthetic', 'opus', 'sonnet', 'haiku'])

export function parseRateTable(doc: unknown): RateTable {
  const table = new Map<string, Rate>()
  if (typeof doc !== 'object' || doc === null) return table
  for (const [name, raw] of Object.entries(doc as Record<string, unknown>)) {
    if (typeof raw !== 'object' || raw === null) continue
    const e = raw as Record<string, unknown>
    const input = finite(e.input_cost_per_token)
    const output = finite(e.output_cost_per_token)
    if (input === null || output === null) continue
    const key = normalize(name)
    if (!key) continue
    table.set(key, {
      input,
      output,
      cacheRead: finite(e.cache_read_input_token_cost) ?? input,
      cacheWrite: finite(e.cache_creation_input_token_cost) ?? input
    })
  }
  // Provider-prefixed entries ("anthropic/claude-x") also answer to the bare name,
  // unless two entries disagree on the price.
  const aliases = new Map<string, Rate | null>()
  for (const [key, rate] of table) {
    const alias = bare(key)
    if (alias === key || table.has(alias)) continue
    const held = aliases.get(alias)
    if (held === undefined) aliases.set(alias, rate)
    else if (held !== null && !sameRate(held, rate)) aliases.set(alias, null)
  }
  for (const [alias, rate] of aliases) if (rate) table.set(alias, rate)
  return table
}

function sameRate(a: Rate, b: Rate): boolean {
  return a.input === b.input && a.output === b.output && a.cacheRead === b.cacheRead && a.cacheWrite === b.cacheWrite
}

export function lookupRate(table: RateTable, model: string): Rate | null {
  const key = stripVariant(normalize(model))
  if (!key || UNPRICEABLE.has(key)) return null
  return table.get(key) ?? table.get(bare(key)) ?? null
}

export interface PricedTokens {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export function costOf(rate: Rate, t: PricedTokens): number {
  return t.input * rate.input + t.output * rate.output + t.cacheRead * rate.cacheRead + t.cacheWrite * rate.cacheWrite
}
