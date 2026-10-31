/**
 * Renders hovr's mark and every icon size the app and installer need.
 *   node scripts/make-icons.cjs
 *
 * The mark: a screen seen at an angle. A black body (thick on the left and bottom,
 * thin on the top and right, chamfered at two corners) holds a light, slightly
 * sheared face. A rectangular notch hangs from the top edge of the face and holds a
 * progress loader with a % sign. Coordinates come from tracing the reference mark.
 */
const { Resvg } = require('@resvg/resvg-js')
const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const root = join(__dirname, '..')

/* ---- the mark, in the reference's own coordinate space ---- */
// The silhouette and the light face, traced from the reference with potrace (scripts/markTrace.json).
const { BODY_PATH, FACE_PATH } = require('./markTrace.json')

/**
 * The notch hangs from the top edge of the face and is sheared by the face's own lean, so it
 * tilts with it. It holds three small progress rings, each with a bar standing in for its %.
 */
const LEAN = 0.11
const TOP = 348 // y of the face's top edge
// Digits and % as strokes in a 4 x 7 box, so the notch can show real "63%" at any size.
const GLYPHS = {
  '3': 'M0.4 0.8C1 0.3 1.6 0.2 2 0.2C3.2 0.2 3.8 1 3.8 1.8C3.8 2.8 3 3.4 1.8 3.4C3 3.4 4 4 4 5.2C4 6.4 3.2 7 2 7C1.2 7 0.6 6.8 0.2 6.2',
  '4': 'M3 7V0.2L0.2 5H4',
  '6': 'M3.2 0.3C1 0.3 0.2 2 0.2 4C0.2 6.2 1 7 2 7C3.2 7 3.8 6 3.8 5C3.8 4 3 3.2 2 3.2C1.2 3.2 0.5 3.7 0.2 4.5',
  '8': 'M2 3.4C1 3.4 0.4 2.8 0.4 1.8C0.4 0.8 1 0.2 2 0.2C3 0.2 3.6 0.8 3.6 1.8C3.6 2.8 3 3.4 2 3.4C0.8 3.4 0.2 4.2 0.2 5.2C0.2 6.3 1 7 2 7C3 7 3.8 6.3 3.8 5.2C3.8 4.2 3.2 3.4 2 3.4Z',
  '%': 'M0.3 1.3a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M1.9 5.7a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M3.8 0.3L0.2 6.9'
}
const NOTCH = {
  // flares into the face's top edge so there is no sharp tip where it meets the rim
  d: 'M298 346V348C308 348 316 350.5 316 361V378Q316 390 328 390H428Q440 390 440 378V361C440 350.5 448 348 458 348V346Z',
  lean: LEAN,
  top: TOP,
  r: 7.5, // ring radius
  w: 3, // ring stroke
  k: 1.75, // glyph scale
  gw: 0.62, // glyph stroke, in glyph units
  adv: 4.8, // glyph advance, in glyph units
  glyphs: GLYPHS,
  items: [
    { cx: 338, cy: 369, pct: 63, text: '63%' },
    { cx: 390, cy: 369, pct: 48, text: '48%' }
  ]
}
const shear = `matrix(1 0 ${LEAN} 1 ${-LEAN * TOP} 0)`

function arcPath(cx, cy, r, pct) {
  if (pct >= 100) return null
  const a = (pct / 100) * Math.PI * 2
  const x = cx + r * Math.sin(a)
  const y = cy - r * Math.cos(a)
  return `M${cx} ${cy - r}A${r} ${r} 0 ${pct > 50 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`
}

/** The rings and numbers in colour `c`, over a faint track. */
function notchItems(c, track) {
  const { items, r, w, k, gw, adv, glyphs } = NOTCH
  return items
    .map(({ cx, cy, pct, text }) => {
      const arc = arcPath(cx, cy, r, pct)
      const ring = arc
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${w}"/><path d="${arc}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`
        : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`
      const x0 = cx + r + w / 2 + 4
      const chars = [...text]
        .map((ch, i) => `<path d="${glyphs[ch]}" transform="translate(${(x0 + i * adv * k).toFixed(2)} ${cy - 3.5 * k}) scale(${k})" fill="none" stroke="${c}" stroke-width="${gw}" stroke-linecap="round" stroke-linejoin="round"/>`)
        .join('')
      return ring + chars
    })
    .join('')
}
const VIEW = { x: 224, y: 316, size: 286 } // square window around the mark
const CANVAS = { w: 735, h: 919 }

/** Mark in `ink` on a flat background `face` (for tiles). */
function markFlat(ink, face) {
  return `<path d="${BODY_PATH}" fill="${ink}"/><path d="${FACE_PATH}" fill="${face}"/><g transform="${shear}"><path d="${NOTCH.d}" fill="${ink}"/>${notchItems(face, 'rgba(231,231,231,0.3)')}</g>`
}

/** Mark with a transparent face, via a mask (tray, in-app, single colour). */
function markMasked(ink, id = 'cut') {
  return `<defs>
    <mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${CANVAS.w}" height="${CANVAS.h}">
      <path d="${BODY_PATH}" fill="#fff"/><path d="${FACE_PATH}" fill="#000"/>
      <g transform="${shear}"><path d="${NOTCH.d}" fill="#fff"/>${notchItems('#000', 'rgba(0,0,0,0.35)')}</g>
    </mask>
  </defs>
  <rect width="${CANVAS.w}" height="${CANVAS.h}" fill="${ink}" mask="url(#${id})"/>`
}

const cx0 = VIEW.x + VIEW.size / 2
const cy0 = VIEW.y + VIEW.size / 2
const fit = (inner, scale) => `<g transform="translate(256 256) scale(${scale}) translate(${-cx0} ${-cy0})">${inner}</g>`

const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect x="8" y="8" width="496" height="496" rx="120" fill="#e7e7e7"/>
  ${fit(markFlat("#0b0b0b", "#e7e7e7"), 1.3)}
</svg>`

const mono = (ink) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.size} ${VIEW.size}" width="512" height="512">
  ${markMasked(ink)}
</svg>`

const trayMono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${fit(markMasked('#ffffff'), 1.75)}
</svg>`

function png(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
}

function ico(sizes, svg) {
  const images = sizes.map((s) => ({ s, data: png(svg, s) }))
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + images.length * 16
  const entries = images.map(({ s, data }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(s >= 256 ? 0 : s, 0)
    e.writeUInt8(s >= 256 ? 0 : s, 1)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

const out = (p) => join(root, p)
mkdirSync(out('resources/appx'), { recursive: true })

writeFileSync(out('resources/icon.png'), png(tile, 512))
writeFileSync(out('resources/icon.ico'), ico([16, 24, 32, 48, 64, 128, 256], tile))
writeFileSync(out('resources/tray.png'), png(trayMono, 64))
for (const [name, size] of [
  ['Square150x150Logo.png', 150],
  ['Square44x44Logo.png', 44],
  ['StoreLogo.png', 50]
]) {
  writeFileSync(out(`resources/appx/${name}`), png(tile, size))
}
for (const [name, w, h] of [
  ['Wide310x150Logo.png', 310, 150],
  ['SplashScreen.png', 620, 300]
]) {
  const s = Math.round(h * 0.78)
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#0b0b0d"/>
    <image href="data:image/png;base64,${png(tile, s * 2).toString('base64')}" x="${(w - s) / 2}" y="${(h - s) / 2}" width="${s}" height="${s}"/>
  </svg>`
  writeFileSync(out(`resources/appx/${name}`), png(wide, w))
}

writeFileSync(out('src/assets/logo.svg'), `${mono('#FFFFFF').replace(/\n\s*/g, '')}\n`)

// Shapes the React Logo component draws, so the app and the icon never drift apart.
writeFileSync(
  out('src/lib/markShapes.ts'),
  `/** Generated by scripts/make-icons.cjs. The hovr mark, in the reference's coordinate space. */\nexport const MARK = ${JSON.stringify(
    { BODY_PATH, FACE_PATH, NOTCH, VIEW, CANVAS },
    null,
    2
  )} as const\n`
)
console.log('icons written')
