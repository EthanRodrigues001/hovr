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
const BODY = '292,342 463,342 485,356 493,517 452,574 266,576 252,556 240,396' // stroked round
const BODY_STROKE = 14
const FACE = '306,359 457,359 471,510 321,510' // stroked round in the face colour
const FACE_STROKE = 18
const LEAN = 0.095 // how far the sheared parts shift right per unit of height
const NOTCH = 'M316 345C326 345 330 350 330 360V412C330 421 337 428 346 428H414C423 428 430 421 430 412V360C430 350 434 345 444 345Z'
const LOADER = { cx: 380, cy: 389, r: 19, w: 5.5 }
const VIEW = { x: 224, y: 314, size: 286 } // square window around the mark
const CANVAS = { w: 735, h: 919 }

/** Notch + loader shear with the face so they follow its tilt. */
const shear = `matrix(1 0 ${LEAN} 1 ${-LEAN * 350} 0)`

function loader(c, track) {
  const { cx, cy, r, w } = LOADER
  const o = 6.6
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${w}"/>
    <path d="M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - r} ${cy}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>
    <circle cx="${cx - o}" cy="${cy - o}" r="2.7" fill="none" stroke="${c}" stroke-width="2.2"/>
    <circle cx="${cx + o}" cy="${cy + o}" r="2.7" fill="none" stroke="${c}" stroke-width="2.2"/>
    <path d="M${cx + 6.5} ${cy - 7.5} L${cx - 6.5} ${cy + 7.5}" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`
}

/** Mark in `ink` on a flat background `face` (for tiles). */
function markFlat(ink, face) {
  return `<g>
    <polygon points="${BODY}" fill="${ink}" stroke="${ink}" stroke-width="${BODY_STROKE}" stroke-linejoin="round"/>
    <polygon points="${FACE}" fill="${face}" stroke="${face}" stroke-width="${FACE_STROKE}" stroke-linejoin="round"/>
    <g transform="${shear}">
      <path d="${NOTCH}" fill="${ink}"/>
      ${loader(face, 'rgba(255,255,255,0.28)')}
    </g>
  </g>`
}

/** Mark with a transparent face, via a mask (tray, in-app, single colour). */
function markMasked(ink, id = 'cut') {
  return `<defs>
    <mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${CANVAS.w}" height="${CANVAS.h}">
      <polygon points="${BODY}" fill="#fff" stroke="#fff" stroke-width="${BODY_STROKE}" stroke-linejoin="round"/>
      <polygon points="${FACE}" fill="#000" stroke="#000" stroke-width="${FACE_STROKE}" stroke-linejoin="round"/>
      <g transform="${shear}">
        <path d="${NOTCH}" fill="#fff"/>
        ${loader('#000', 'rgba(0,0,0,0.65)')}
      </g>
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
    { BODY, BODY_STROKE, FACE, FACE_STROKE, LEAN, NOTCH, LOADER, VIEW, CANVAS },
    null,
    2
  )} as const\n`
)
console.log('icons written')
