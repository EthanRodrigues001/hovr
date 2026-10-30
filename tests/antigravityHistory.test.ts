import { describe, expect, it } from 'vitest'
import { readFields, recordsFromRows } from '../electron/main/history/antigravityParse'

/* A tiny protobuf encoder, just enough to build fixtures. */
const varint = (n: number): number[] => {
  const out: number[] = []
  let v = n
  while (v >= 128) {
    out.push((v % 128) | 128)
    v = Math.floor(v / 128)
  }
  out.push(v)
  return out
}
const vf = (field: number, n: number): number[] => [...varint(field * 8), ...varint(n)]
const lf = (field: number, bytes: number[] | Uint8Array): number[] => [...varint(field * 8 + 2), ...varint(bytes.length), ...bytes]
const str = (field: number, s: string): number[] => lf(field, [...new TextEncoder().encode(s)])
const msg = (...parts: number[][]): Uint8Array => Uint8Array.from(parts.flat())

const usage = (o: { model?: number; input?: number; output?: number; cached?: number; write?: number; id?: string }) =>
  msg(
    vf(1, o.model ?? 0),
    vf(2, o.input ?? 0),
    vf(3, o.output ?? 0),
    vf(4, o.write ?? 0),
    vf(5, o.cached ?? 0),
    o.id ? str(11, o.id) : []
  )

/** gen_metadata blob: field 1 holds the data message (usage in 4, model name in 19, time in 9.4). */
const genBlob = (u: Uint8Array, name = 'Gemini 3.1 Pro (High)', seconds = 1_761_800_000) =>
  msg(lf(1, msg(lf(4, u), str(19, name), lf(9, msg(lf(4, msg(vf(1, seconds))))))))

describe('readFields', () => {
  it('reads varint and length-delimited fields', () => {
    const f = readFields(msg(vf(2, 300), str(3, 'hi')))
    expect(f.get(2)).toEqual([300])
    expect(new TextDecoder().decode(f.get(3)![0] as Uint8Array)).toBe('hi')
  })
  it('throws on truncated data (callers skip the row)', () => {
    expect(() => readFields(Uint8Array.from([0x12, 0x09, 0x01]))).toThrow()
  })
})

describe('recordsFromRows', () => {
  it('maps counters, model and timestamp', () => {
    const rows = [{ idx: 0, blob: genBlob(usage({ input: 100, output: 50, cached: 400, write: 20, id: 'req-1' })) }]
    const [r] = recordsFromRows('conv', rows, [], 0)
    expect(r).toMatchObject({
      provider: 'antigravity',
      model: 'gemini-3.1-pro-high'.replace(/-high$/, ''),
      input: 100,
      output: 50,
      cacheRead: 400,
      cacheWrite: 20,
      timestampMs: 1_761_800_000_000,
      dedupeKey: 'antigravity:11:req-1'
    })
  })

  it('merges a generation and a step that share a request id, keeping the larger counters', () => {
    const gen = genBlob(usage({ input: 100, output: 10, id: 'req-1' }))
    const step = msg(lf(9, usage({ input: 120, output: 40, id: 'req-1' })), lf(24, msg(str(12, 'Gemini 3.1 Pro'))))
    const out = recordsFromRows('conv', [{ idx: 0, blob: gen }], [{ idx: 0, blob: step }], 0)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ input: 120, output: 40 })
  })

  it('skips all-zero usage and rows that cannot be decoded', () => {
    const rows = [
      { idx: 0, blob: genBlob(usage({})) },
      { idx: 1, blob: Uint8Array.from([0x0a, 0x7f]) }
    ]
    expect(recordsFromRows('conv', rows, [], 0)).toEqual([])
  })

  it('falls back to the file time when a row has no timestamp', () => {
    const blob = msg(lf(1, msg(lf(4, usage({ input: 5, id: 'x' })), str(19, 'Claude Sonnet 4.5'))))
    const [r] = recordsFromRows('conv', [{ idx: 0, blob }], [], 42)
    expect(r.timestampMs).toBe(42)
    expect(r.model).toBe('claude-sonnet-4-5')
  })
})
