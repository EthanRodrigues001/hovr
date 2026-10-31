/**
 * Cleans the potrace output so the mark has straight edges and smooth corners instead of
 * pixel-noise wobble.
 *   node scripts/mark-smooth.cjs
 * Reads scripts/markTrace.raw.json (the untouched trace), writes scripts/markTrace.json.
 * Each closed outline is resampled evenly, lightly smoothed, split into straight runs (refit
 * as exact lines) and curved runs (kept, smoothed, fitted with Catmull-Rom Béziers).
 */
const { readFileSync, writeFileSync, existsSync, copyFileSync } = require('node:fs')
const { join } = require('node:path')

const dir = __dirname
const rawFile = join(dir, 'markTrace.raw.json')
const outFile = join(dir, 'markTrace.json')
if (!existsSync(rawFile)) copyFileSync(outFile, rawFile)
const raw = JSON.parse(readFileSync(rawFile, 'utf8'))

/** Absolute M/L/C/Z path → list of closed subpaths, each a dense polyline. */
function sample(d) {
  const toks = d.match(/[MLCZ]|-?\d*\.?\d+/g)
  const subs = []
  let cur = null
  let p = [0, 0]
  for (let i = 0; i < toks.length; ) {
    const t = toks[i++]
    if (t === 'M') {
      cur = [[+toks[i], +toks[i + 1]]]
      p = cur[0]
      i += 2
      subs.push(cur)
    } else if (t === 'L') {
      p = [+toks[i], +toks[i + 1]]
      cur.push(p)
      i += 2
    } else if (t === 'C') {
      const [x1, y1, x2, y2, x3, y3] = toks.slice(i, i + 6).map(Number)
      i += 6
      for (let s = 1; s <= 16; s++) {
        const u = s / 16
        const a = (1 - u) ** 3
        const b = 3 * (1 - u) ** 2 * u
        const c = 3 * (1 - u) * u * u
        const e = u ** 3
        cur.push([a * p[0] + b * x1 + c * x2 + e * x3, a * p[1] + b * y1 + c * y2 + e * y3])
      }
      p = [x3, y3]
    }
  }
  return subs
}

function resample(pts, step) {
  const closed = [...pts, pts[0]]
  const lens = [0]
  for (let i = 1; i < closed.length; i++) lens.push(lens[i - 1] + Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]))
  const total = lens[lens.length - 1]
  const n = Math.round(total / step)
  const out = []
  let j = 1
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total
    while (lens[j] < target) j++
    const f = (target - lens[j - 1]) / (lens[j] - lens[j - 1] || 1)
    out.push([closed[j - 1][0] + f * (closed[j][0] - closed[j - 1][0]), closed[j - 1][1] + f * (closed[j][1] - closed[j - 1][1])])
  }
  return out
}

function gauss(pts, sigma) {
  const n = pts.length
  const r = Math.ceil(sigma * 3)
  const w = []
  for (let i = -r; i <= r; i++) w.push(Math.exp(-(i * i) / (2 * sigma * sigma)))
  const sum = w.reduce((a, b) => a + b, 0)
  return pts.map((_, i) => {
    let x = 0
    let y = 0
    for (let k = -r; k <= r; k++) {
      const q = pts[(i + k + n * 8) % n]
      x += q[0] * w[k + r]
      y += q[1] * w[k + r]
    }
    return [x / sum, y / sum]
  })
}

const heading = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0])
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))

function fitLine(pts) {
  const n = pts.length
  const mx = pts.reduce((a, p) => a + p[0], 0) / n
  const my = pts.reduce((a, p) => a + p[1], 0) / n
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (const p of pts) {
    sxx += (p[0] - mx) ** 2
    sxy += (p[0] - mx) * (p[1] - my)
    syy += (p[1] - my) ** 2
  }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  return { mx, my, dx: Math.cos(th), dy: Math.sin(th) }
}
const project = (l, p) => {
  const t = (p[0] - l.mx) * l.dx + (p[1] - l.my) * l.dy
  return [l.mx + t * l.dx, l.my + t * l.dy]
}

function smoothOutline(pts) {
  const STEP = 1.5
  const s = gauss(resample(pts, STEP), 2.2)
  const n = s.length
  // Turning over ±W samples: near zero on a straight edge, large in a corner.
  const W = Math.round(9 / STEP)
  const turn = s.map((_, i) => Math.abs(wrap(heading(s[i], s[(i + W) % n]) - heading(s[(i - W + n) % n], s[i]))))
  const straight = turn.map((t) => t < 0.1)
  // rotate so index 0 starts a run
  let start = straight.findIndex((v, i) => v !== straight[(i - 1 + n) % n])
  if (start < 0) start = 0
  const runs = []
  let run = { straight: straight[start], pts: [] }
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n
    if (straight[i] !== run.straight) {
      runs.push(run)
      run = { straight: straight[i], pts: [] }
    }
    run.pts.push(s[i])
  }
  runs.push(run)
  // a straight run must be long enough and truly flat; otherwise treat as curve
  for (const r of runs) {
    if (!r.straight) continue
    if (r.pts.length * STEP < 28) {
      r.straight = false
      continue
    }
    const l = fitLine(r.pts)
    const dev = Math.max(...r.pts.map((p) => Math.hypot(p[0] - project(l, p)[0], p[1] - project(l, p)[1])))
    if (dev > 2.2) r.straight = false
    else r.line = l
  }
  // merge adjacent curved runs
  const merged = []
  for (const r of runs) {
    const last = merged[merged.length - 1]
    if (last && !last.straight && !r.straight) last.pts = last.pts.concat(r.pts)
    else merged.push({ ...r })
  }
  // lines snap to their fitted line; neighbours of a line end at the projected endpoints
  for (const r of merged) {
    if (!r.straight) continue
    r.pts = [project(r.line, r.pts[0]), project(r.line, r.pts[r.pts.length - 1])]
  }
  return merged
}

function toPath(runs) {
  const f = (v) => +v.toFixed(2)
  let d = ''
  const first = runs[0].pts[0]
  d += `M ${f(first[0])} ${f(first[1])}`
  for (let ri = 0; ri < runs.length; ri++) {
    const r = runs[ri]
    if (r.straight) {
      d += ` L ${f(r.pts[1][0])} ${f(r.pts[1][1])}`
    } else {
      // thin the curve to ~every 5 units, anchored on the previous end and the next start
      const prev = runs[(ri - 1 + runs.length) % runs.length]
      const next = runs[(ri + 1) % runs.length]
      const a = prev.straight ? prev.pts[1] : r.pts[0]
      const b = next.straight ? next.pts[0] : r.pts[r.pts.length - 1]
      const inner = r.pts.filter((_, i) => i % 4 === 0 && i > 0 && i < r.pts.length - 1)
      const ctrl = [a, ...inner, b]
      for (let i = 0; i < ctrl.length - 1; i++) {
        const p0 = ctrl[Math.max(0, i - 1)]
        const p1 = ctrl[i]
        const p2 = ctrl[i + 1]
        const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)]
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
        d += ` C ${f(c1[0])} ${f(c1[1])}, ${f(c2[0])} ${f(c2[1])}, ${f(p2[0])} ${f(p2[1])}`
      }
    }
  }
  return `${d} Z`
}

const result = { note: 'Smoothed by scripts/mark-smooth.cjs from markTrace.raw.json.' }
for (const key of ['BODY_PATH', 'FACE_PATH']) {
  const subs = sample(raw[key])
  result[key] = subs.map((pts) => toPath(smoothOutline(pts))).join(' ')
  console.log(key, 'subpaths', subs.length, 'chars', result[key].length)
}
writeFileSync(outFile, JSON.stringify(result, null, 2))
