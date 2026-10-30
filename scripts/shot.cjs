/**
 * Render the dev renderer (npm run dev must be running) with the mock bridge and save a PNG.
 *   electron scripts/shot.cjs "view=analytics&tab=timeline" out.png
 * Never touches the real app, the mouse or other windows.
 */
const { app, BrowserWindow } = require('electron')
const { writeFileSync } = require('node:fs')

const query = process.argv[2] || 'view=usage'
const out = process.argv[3] || 'shot.png'

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1080,
    height: 760,
    x: -3000,
    y: 0,
    show: true,
    frame: false,
    backgroundColor: '#1a1a1a',
    webPreferences: { backgroundThrottling: false }
  })
  await win.loadURL(`http://localhost:5173/?${query.includes('mock=') ? '' : 'mock=1&'}${query}`)
  await new Promise((r) => setTimeout(r, 2500))
  const image = await win.webContents.capturePage()
  writeFileSync(out, image.toPNG())
  app.quit()
})
