/**
 * Reads one Antigravity conversation database with sql.js (SQLite compiled to
 * WebAssembly). Electron's bundled Node has no built-in SQLite, and a native module
 * would complicate packaging. The file is opened read-only into memory, never written.
 * A `-wal` sidecar (uncommitted rows) is not applied; those are usually empty.
 */
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import type { Database, SqlJsStatic } from 'sql.js'
import type { UsageRecord } from './parse'
import { type MetaRow, recordsFromRows } from './antigravityParse'

const require = createRequire(import.meta.url)
let sqlReady: Promise<SqlJsStatic> | null = null

function sql(): Promise<SqlJsStatic> {
  if (!sqlReady) {
    sqlReady = (async () => {
      const initSqlJs = require('sql.js') as (config: { wasmBinary: ArrayBuffer }) => Promise<SqlJsStatic>
      const wasm = await readFile(require.resolve('sql.js/dist/sql-wasm.wasm'))
      return initSqlJs({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer })
    })()
    sqlReady.catch(() => (sqlReady = null))
  }
  return sqlReady
}

function rowsOf(db: Database, query: string): MetaRow[] {
  const out: MetaRow[] = []
  const stmt = db.prepare(query)
  try {
    while (stmt.step()) {
      const [idx, blob] = stmt.get()
      if (typeof idx === 'number' && blob instanceof Uint8Array) out.push({ idx, blob: blob.slice() })
    }
  } finally {
    stmt.free()
  }
  return out
}

export async function readAntigravityDb(path: string, sessionId: string, mtimeMs: number): Promise<UsageRecord[]> {
  const SQL = await sql()
  const db = new SQL.Database(new Uint8Array(await readFile(path)))
  try {
    const tables = new Set<string>()
    const t = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    while (t.step()) tables.add(String(t.get()[0]))
    t.free()
    if (!tables.has('gen_metadata') && !tables.has('steps')) return []
    const generations = tables.has('gen_metadata') ? rowsOf(db, 'SELECT idx, data FROM gen_metadata') : []
    const steps = tables.has('steps') ? rowsOf(db, 'SELECT idx, metadata FROM steps WHERE metadata IS NOT NULL') : []
    return recordsFromRows(sessionId, generations, steps, mtimeMs)
  } finally {
    db.close()
  }
}
