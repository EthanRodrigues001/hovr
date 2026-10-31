/**
 * Lays the generated mark over a reference image so the two can be compared.
 *   node scripts/mark-compare.cjs <reference.png> [out.png]
 * Left: the reference. Middle: the mark rendered alone. Right: the mark's outlines (red) over the
 * reference. Both are drawn in the reference's 735x919 coordinate space.
 */
const { Resvg } = require('@resvg/resvg-js')
const { readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
// The generated shapes (run make-icons.cjs first).
const shapesSrc = readFileSync(join(__dirname, '..', 'src/lib/markShapes.ts'), 'utf8')
const MARK = JSON.parse(shapesSrc.slice(shapesSrc.indexOf('{'), shapesSrc.lastIndexOf('}') + 1))

const [refPath, outPath = join(__dirname, '..', 'compare.png')] = process.argv.slice(2)
if (!refPath) {
  console.error('usage: node scripts/mark-compare.cjs <reference.png> [out.png]')
  process.exit(1)
}
const ref = readFileSync(refPath).toString('base64')
const { BODY, BODY_STROKE, FACE, FACE_STROKE } = MARK
const W = 735
const H = 919

const shape = (ink, face) => `
  <polygon points="${BODY}" fill="${ink}" stroke="${ink}" stroke-width="${BODY_STROKE}" stroke-linejoin="round"/>
  <polygon points="${FACE}" fill="${face}" stroke="${face}" stroke-width="${FACE_STROKE}" stroke-linejoin="round"/>`
const outline = `
  <polygon points="${BODY}" fill="none" stroke="#ff2d2d" stroke-width="${BODY_STROKE}" stroke-linejoin="round" stroke-opacity="0.35"/>
  <polygon points="${FACE}" fill="none" stroke="#2d6bff" stroke-width="${FACE_STROKE}" stroke-linejoin="round" stroke-opacity="0.45"/>`
const img = `<image href="data:image/png;base64,${ref}" width="${W}" height="${H}"/>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 3}" height="${H}" viewBox="0 0 ${W * 3} ${H}">
  <g>${img}</g>
  <g transform="translate(${W} 0)"><rect width="${W}" height="${H}" fill="#dadada"/>${shape('#000', '#dadada')}</g>
  <g transform="translate(${W * 2} 0)">${img}${outline}</g>
</svg>`
writeFileSync(outPath, new Resvg(svg).render().asPng())
console.log('wrote', outPath)
