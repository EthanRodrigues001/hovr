/**
 * Antigravity conversation databases -> usage records. Pure (bytes in, records out).
 *
 * Each conversation is a SQLite file. Its `gen_metadata` and `steps` tables hold a
 * protobuf blob per model call; inside, a usage message carries token counters. The
 * field numbers below were worked out from the files themselves (and cross-checked
 * against T3 Code's reader). Anything unexpected is skipped, never thrown.
 */
import type { UsageRecord } from './parse'

type Value = number | Uint8Array
type Fields = Map<number, Value[]>

/** Minimal protobuf reader: varints and length-delimited fields; fixed-width fields are skipped. */
export function readFields(bytes: Uint8Array): Fields {
  const out: Fields = new Map()
  let i = 0
  const varint = (): number => {
    let result = 0
    let mul = 1
    for (let n = 0; n < 10; n++) {
      const b = bytes[i++]
      if (b === undefined) throw new Error('truncated varint')
      result += (b & 127) * mul
      if (b < 128) return result
      mul *= 128
    }
    throw new Error('bad varint')
  }
  while (i < bytes.length) {
    const tag = varint()
    const field = Math.floor(tag / 8)
    const wire = tag % 8
    if (field === 0) throw new Error('bad field')
    let value: Value | null = null
    if (wire === 0) value = varint()
    else if (wire === 2) {
      const len = varint()
      if (len > bytes.length - i) throw new Error('truncated field')
      value = bytes.subarray(i, i + len)
      i += len
    } else if (wire === 1) i += 8
    else if (wire === 5) i += 4
    else throw new Error('unsupported wire type')
    if (value !== null) {
      const list = out.get(field)
      if (list) list.push(value)
      else out.set(field, [value])
    }
  }
  return out
}

const num = (f: Fields, k: number): number => {
  const v = f.get(k)?.[0]
  return typeof v === 'number' ? v : 0
}
const raw = (f: Fields, k: number): Uint8Array | undefined => {
  const v = f.get(k)?.[0]
  return v instanceof Uint8Array ? v : undefined
}
const sub = (f: Fields, k: number): Fields => {
  const b = raw(f, k)
  return b ? readFields(b) : new Map()
}
const text = (f: Fields, k: number): string => {
  const b = raw(f, k)
  if (!b) return ''
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b).trim()
  } catch {
    return ''
  }
}
const ts = (f: Fields): number | null => {
  const s = num(f, 1)
  return s > 0 ? s * 1000 + Math.floor(num(f, 2) / 1_000_000) : null
}

/** Model ids seen in usage messages. Unknown ids fall back to the name in the metadata. */
const MODEL_IDS: Record<number, string> = {
  246: 'gemini-2.5-pro',
  312: 'gemini-2.5-flash',
  313: 'gemini-2.5-flash-thinking',
  329: 'gemini-2.5-flash-thinking',
  330: 'gemini-2.5-flash-lite',
  281: 'claude-sonnet-4',
  282: 'claude-sonnet-4',
  290: 'claude-opus-4',
  291: 'claude-opus-4',
  333: 'claude-sonnet-4-5',
  334: 'claude-sonnet-4-5',
  340: 'claude-haiku-4-5',
  341: 'claude-haiku-4-5',
  1026: 'claude-opus-4-6',
  1035: 'claude-sonnet-4-6',
  1016: 'gemini-3.1-pro',
  1036: 'gemini-3.1-pro',
  1037: 'gemini-3.1-pro',
  1018: 'gemini-3-flash-preview',
  1084: 'gemini-3-flash-preview',
  1047: 'gemini-3-flash-preview'
}

function modelName(name: string, id: number): string {
  if (name) {
    let n = name.toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').replaceAll(' ', '-')
    if (n.startsWith('claude-')) n = n.replace(/^claude-(4(?:\.\d+)?)-(sonnet|opus|haiku)/, 'claude-$2-$1').replaceAll('.', '-')
    return n
  }
  return MODEL_IDS[id] ?? (id > 0 ? `antigravity-model-${id}` : '')
}

/** Thinking level is part of the slug but shares the base model's price. */
const stripLevel = (m: string): string => m.replace(/-(?:low|medium|high)$/, '')

interface Entry {
  model: string
  timestampMs: number | null
  usages: Fields[]
}

/** `step` rows come from the steps table's metadata column; otherwise a gen_metadata blob. */
function entryOf(bytes: Uint8Array, step: boolean): Entry {
  const root = readFields(bytes)
  const data = step ? root : sub(root, 1)
  const model = step ? sub(data, 24) : data
  const usageBytes = raw(data, step ? 9 : 4)
  const usages = usageBytes ? [readFields(usageBytes)] : []
  for (const retry of data.get(step ? 28 : 17) ?? []) {
    if (!(retry instanceof Uint8Array)) continue
    const inner = raw(readFields(retry), 2)
    if (inner) usages.push(readFields(inner))
  }
  return {
    model: modelName(text(model, step ? 12 : 19) || text(model, step ? 8 : 21), num(model, step ? 1 : 3)),
    timestampMs: step ? (ts(sub(data, 8)) ?? ts(sub(data, 1))) : ts(sub(sub(data, 9), 4)),
    usages
  }
}

export interface MetaRow {
  idx: number
  blob: Uint8Array
}

/**
 * Turn the rows of one conversation into usage records. `steps` and `generations` can
 * describe the same model call, so records sharing an id are merged (max counters).
 */
export function recordsFromRows(
  sessionId: string,
  generations: MetaRow[],
  steps: MetaRow[],
  fallbackTimestampMs: number
): UsageRecord[] {
  const decode = (rows: MetaRow[], step: boolean) => {
    const out: Array<{ idx: number; entry: Entry }> = []
    for (const row of rows) {
      try {
        out.push({ idx: row.idx, entry: entryOf(row.blob, step) })
      } catch {
        /* undecodable row: skip */
      }
    }
    return out.sort((a, b) => a.idx - b.idx)
  }
  const gens = decode(generations, false)
  const stepEntries = decode(steps, true)
  const genModels = new Map(gens.map((g) => [g.idx, g.entry.model]))

  const byKey = new Map<string, UsageRecord>()
  const records: UsageRecord[] = []
  for (const [source, list] of [['step', stepEntries], ['generation', gens]] as const) {
    list.forEach(({ idx, entry }, index) => {
      entry.usages.forEach((usage, u) => {
        const output = Math.max(num(usage, 3), num(usage, 9) + num(usage, 10))
        const input = num(usage, 2)
        const cacheRead = num(usage, 5)
        const cacheWrite = num(usage, 4)
        if (input + cacheRead + cacheWrite + output === 0) return
        const keys = ([11, 12, 7] as const).flatMap((k) => {
          const id = text(usage, k)
          return id ? [`antigravity:${k}:${id}`] : []
        })
        const model = stripLevel(
          MODEL_IDS[num(usage, 1)] ||
            entry.model ||
            (source === 'step' ? genModels.get(idx) : '') ||
            modelName('', num(usage, 1)) ||
            'antigravity-unknown'
        )
        const record: UsageRecord = {
          provider: 'antigravity',
          timestampMs: entry.timestampMs ?? fallbackTimestampMs,
          model,
          input,
          output,
          cacheRead,
          cacheWrite,
          dedupeKey: keys[0] ?? `antigravity:${sessionId}:${source}:${index}:${u}`,
          reportedCostUsd: null
        }
        const existing = keys.map((k) => byKey.get(k)).find(Boolean)
        if (existing) {
          existing.input = Math.max(existing.input, input)
          existing.output = Math.max(existing.output, output)
          existing.cacheRead = Math.max(existing.cacheRead, cacheRead)
          existing.cacheWrite = Math.max(existing.cacheWrite, cacheWrite)
          if (existing.model === 'antigravity-unknown') existing.model = model
          for (const k of keys) byKey.set(k, existing)
          return
        }
        records.push(record)
        for (const k of keys) byKey.set(k, record)
      })
    })
  }
  return records
}
