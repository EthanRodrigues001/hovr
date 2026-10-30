/**
 * Renders hovr's mark and every icon size the app and installer need.
 *   node scripts/make-icons.cjs
 *
 * The mark: a screen seen at an angle (a black body with a light face) with a notch
 * hanging from the top edge of the face, with a progress loader (and %) in it.
 */
const { Resvg } = require('@resvg/resvg-js')
const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const root = join(__dirname, '..')

/* ---- the mark, in a 512 box ---- */
const BODY = '130,190 170,150 380,150 380,360 340,400 130,400' // extruded body, stroked round
const FACE = { x: 184, y: 164, w: 182, h: 182, r: 18 } // light face (the "screen")
const NOTCH = 'M201 158C212 158 215 163 215 174V234C215 243 222 250 231 250H319C328 250 335 243 335 234V174C335 163 338 158 349 158Z'
const BARS = []
// loader (progress ring with a % inside), cut out of the notch
const LOADER = { cx: 275, cy: 206, r: 25, w: 7 }
const STROKE = 26


/** The loader: a 3/4 progress ring with a % sign inside, drawn in `c` (and `track` for the rest of the ring). */
function loader(c, track) {
  const { cx, cy, r, w } = LOADER
  const o = 8.6
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${w}"/>
    <path d="M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - r} ${cy}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>
    <circle cx="${cx - o}" cy="${cy - o}" r="3.5" fill="none" stroke="${c}" stroke-width="2.8"/>
    <circle cx="${cx + o}" cy="${cy + o}" r="3.5" fill="none" stroke="${c}" stroke-width="2.8"/>
    <path d="M${cx + 8.5} ${cy - 9.5} L${cx - 8.5} ${cy + 9.5}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`
}

/** Mark drawn in `ink` with the face showing `face` (use for a flat tile). */
function markFlat(ink, face) {
  return `<g>
    <polygon points="${BODY}" fill="${ink}" stroke="${ink}" stroke-width="${STROKE}" stroke-linejoin="round"/>
    <rect x="${FACE.x}" y="${FACE.y}" width="${FACE.w}" height="${FACE.h}" rx="${FACE.r}" fill="${face}"/>
    <path d="${NOTCH}" fill="${ink}"/>
    ${loader(face, ink === face ? face : "rgba(255,255,255,0.28)")}
  </g>`
}

/** Mark with a transparent face, via a mask (for tray / in-app single-colour use). */
function markMasked(ink, id = 'cut') {
  return `<defs>
    <mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
      <polygon points="${BODY}" fill="#fff" stroke="#fff" stroke-width="${STROKE}" stroke-linejoin="round"/>
      <rect x="${FACE.x}" y="${FACE.y}" width="${FACE.w}" height="${FACE.h}" rx="${FACE.r}" fill="#000"/>
      <path d="${NOTCH}" fill="#fff"/>
      ${loader("#000", "rgba(0,0,0,0.65)")}
    </mask>
  </defs>
  <rect width="512" height="512" fill="${ink}" mask="url(#${id})"/>`
}

const fit = (inner) => `<g transform="translate(256 256) scale(1.12) translate(-255 -275)">${inner}</g>`

const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect x="8" y="8" width="496" height="496" rx="120" fill="#e7e7e7"/>
  ${fit(markFlat('#0b0b0b', '#e7e7e7'))}
</svg>`

const mono = (ink) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${markMasked(ink)}
</svg>`

/** For the tray, the mark fills the square so it stays legible at 16px. */
const trayMono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(256 256) scale(1.45) translate(-255 -275)">${markMasked('#ffffff')}</g>
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

writeFileSync(out('src/assets/logo.svg'), `<svg width="200" height="200" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">${mono('#FFFFFF').replace(/\n\s*/g, '')}</svg>\n`)

// Data the React Logo component embeds (kept in one place so the shapes never drift).
writeFileSync(
  out('src/lib/markShapes.ts'),
  `/** Generated by scripts/make-icons.cjs. The hovr mark in a 512 box. */\nexport const MARK = ${JSON.stringify({ BODY, FACE, NOTCH, LOADER, STROKE }, null, 2)} as const\n`
)
console.log('icons written')
