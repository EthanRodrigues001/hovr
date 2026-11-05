// Copies the app's real UI (components, libs, store, styles, shared types) into src/hovr
// so the site renders the actual HOVR interface. Run: node scripts/sync-ui.cjs
// lib/edge.ts is NOT copied: the site supplies a mock bridge (src/hovr/src/lib/edge.ts).
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const out = path.resolve(__dirname, '..', 'src', 'hovr')
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.cpSync(from, to, { recursive: true, filter: (s) => !s.endsWith('edge.ts') })
}
for (const d of ['components', 'lib', 'store', 'hooks']) copy(path.join(root, 'src', d), path.join(out, 'src', d))
copy(path.join(root, 'shared'), path.join(out, 'shared'))
const css = (f) => fs.readFileSync(path.join(root, 'src', 'styles', f), 'utf8')
const g = css('global.css')
const scroll = g.slice(g.indexOf('/* ---------- scroll areas'))
fs.mkdirSync(path.join(out, 'styles'), { recursive: true })
fs.writeFileSync(path.join(out, 'styles', 'hovr.css'), [css('tokens.css'), scroll, css('notch.css'), css('analytics.css')].join('\n'))
console.log('synced UI into src/hovr')
