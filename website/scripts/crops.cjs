// Crops real HOVR screenshots (public/shots) into the feature images (public/ui). node scripts/crops.cjs
// pill.png and alerts.png come from the /og/pill and /og/alerts routes (headless screenshot, 960x640).
const sharp = require('sharp')
const jobs = [
  ['usage', 'pace', { left: 0, top: 60, width: 964, height: 640 }],
  ['settings', 'tools', { left: 302, top: 4, width: 1020, height: 680 }],
  ['pill', 'pill', null],
  ['forecast', 'forecast', { left: 32, top: 88, width: 1560, height: 960 }],
  ['spend', 'spend', { left: 32, top: 88, width: 1560, height: 950 }],
  ['timeline', 'timeline', { left: 32, top: 88, width: 1560, height: 950 }],
  ['alerts', 'alerts', null]
]
;(async () => {
  for (const [file, out, region] of jobs) {
    let img = sharp(`public/shots/${file}.png`)
    if (region) img = img.extract(region)
    await img.webp({ quality: 88 }).toFile(`public/ui/f-${out}.webp`)
    console.log(out)
  }
})()
