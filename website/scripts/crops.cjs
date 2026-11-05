// Crops real HOVR analytics screenshots into the feature cards. node scripts/crops.cjs
const sharp = require('sharp')
const src = (n) => `public/shots/${n}.png`
const jobs = [
  ['forecast', 'rings', { left: 1096, top: 96, width: 500, height: 470 }],
  ['forecast', 'forecast-list', { left: 40, top: 100, width: 1030, height: 400 }],
  ['spend', 'spend', { left: 560, top: 100, width: 1032, height: 470 }],
  ['timeline', 'timeline', { left: 32, top: 90, width: 1560, height: 600 }]
]
;(async () => {
  for (const [file, out, region] of jobs) {
    await sharp(src(file)).extract(region).webp({ quality: 88 }).toFile(`public/ui/${out}.webp`)
    console.log(out)
  }
})()
