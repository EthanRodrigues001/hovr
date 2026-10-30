/**
 * Renders hovr's app icon (a glossy silver notch on a dark tile) to every size the
 * app and installer need.   node scripts/make-icons.cjs
 */
const { Resvg } = require('@resvg/resvg-js')
const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const root = join(__dirname, '..')

/** The notch silhouette in a 512 box: hangs from the top edge with flared corners, deep rounded bottom. */
const NOTCH = 'M70 22H442C400 22 378 46 378 102V204C378 272 326 328 256 328C186 328 134 272 134 204V102C134 46 112 22 70 22Z'

const tile = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#242424"/>
      <stop offset="1" stop-color="#111"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#050505"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
    <linearGradient id="silver" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.38" stop-color="#d9d9d9"/>
      <stop offset="0.62" stop-color="#f4f4f4"/>
      <stop offset="1" stop-color="#a9a9a9"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0.2">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="drop" x="-30%" y="-30%" width="160%" height="170%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="14"/>
      <feOffset dy="16"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="panel"><rect x="30" y="30" width="452" height="452" rx="104"/></clipPath>
    <clipPath id="shape"><path d="${NOTCH}"/></clipPath>
  </defs>
  <rect x="14" y="14" width="484" height="484" rx="124" fill="url(#rim)"/>
  <rect x="30" y="30" width="452" height="452" rx="104" fill="url(#bg)"/>
  <g clip-path="url(#panel)" opacity="0.9">
    <polygon points="-40,330 300,-10 372,62 32,402" fill="#fff" opacity="0.035"/>
    <polygon points="200,540 560,180 560,260 280,540" fill="#fff" opacity="0.04"/>
    <polygon points="330,-20 540,-20 540,190 400,50" fill="#fff" opacity="0.05"/>
  </g>
  <g clip-path="url(#panel)">
  <g filter="url(#drop)">
    <path d="${NOTCH}" fill="url(#silver)"/>
  </g>
  </g>
  <g clip-path="url(#shape)">
    <path d="M110 140L300 120L196 420L90 420Z" fill="url(#sheen)" opacity="0.55"/>
  </g>
</svg>`

/** Single-colour version for the tray (the system tints or shows it on any bar). */
const mono = (color) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <path d="${NOTCH}" fill="${color}"/>
</svg>`

function png(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
}

/** ICO container holding PNG images. */
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
writeFileSync(out('resources/tray.png'), png(mono('#ffffff'), 64))
for (const [name, size] of [
  ['Square150x150Logo.png', 150],
  ['Square44x44Logo.png', 44],
  ['StoreLogo.png', 50]
]) {
  writeFileSync(out(`resources/appx/${name}`), png(tile, size))
}

// Wide tiles: the icon centred on near-black.
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

// In-app mark (flat, currentColor) and its SVG file.
writeFileSync(
  out('src/assets/logo.svg'),
  `<svg width="200" height="200" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="${NOTCH}" fill="#FFFFFF"/>\n</svg>\n`
)
console.log('icons written; NOTCH path:', NOTCH)
