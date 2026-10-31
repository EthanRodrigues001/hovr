/**
 * HOVR setup. A small dark window that wraps the real NSIS installer (payload/payload.exe):
 * Install on a fresh PC, Reinstall / Uninstall when HOVR is already there.
 * The NSIS installer is run silently, so auto-updates keep working the usual way.
 */
const { app, BrowserWindow, ipcMain } = require('electron')
const { spawn, execFile } = require('node:child_process')
const { existsSync, rmSync } = require('node:fs')
const { join } = require('node:path')

const installDir = join(process.env.LOCALAPPDATA || '', 'Programs', 'HOVR')
const exePath = join(installDir, 'HOVR.exe')
const uninstaller = join(installDir, 'Uninstall HOVR.exe')
const payload = app.isPackaged ? join(process.resourcesPath, 'payload.exe') : join(__dirname, 'payload', 'payload.exe')

let win = null

const run = (cmd, args) => new Promise((resolve) => execFile(cmd, args, { windowsHide: true }, (err, stdout) => resolve(err ? '' : String(stdout))))

/** Version of the installed copy, from its registry entry; null when not installed. */
async function installedState() {
  if (!existsSync(exePath)) return { installed: false }
  const out = await run('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall', '/s', '/f', 'HOVR', '/d'])
  const block = out.split(/\r?\n\r?\n/).find((b) => /DisplayName\s+REG_SZ\s+HOVR/i.test(b)) || ''
  const version = (block.match(/DisplayVersion\s+REG_SZ\s+(\S+)/i) || [])[1] || null
  return { installed: true, version }
}

const send = (channel, data) => win && !win.isDestroyed() && win.webContents.send(channel, data)

function waitFor(child) {
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit code ${code}`))))
  })
}

async function closeRunning() {
  await run('taskkill', ['/F', '/IM', 'HOVR.exe'])
  await new Promise((r) => setTimeout(r, 600))
}

async function doUninstall() {
  await closeRunning()
  if (existsSync(uninstaller)) {
    // _?= makes the uninstaller run in place and wait, so we know when it is done.
    await waitFor(spawn(uninstaller, ['/S', `_?=${installDir}`], { windowsHide: true }))
  }
  try {
    rmSync(installDir, { recursive: true, force: true })
  } catch {
    /* a leftover file is harmless */
  }
}

async function doInstall() {
  send('phase', 'closing')
  await closeRunning()
  send('phase', 'installing')
  await waitFor(spawn(payload, ['/S'], { windowsHide: true }))
  if (!existsSync(exePath)) throw new Error('The files were not installed')
}

const result = (fn) => async () => {
  try {
    await fn()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) }
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 560,
    height: 380,
    frame: false,
    resizable: false,
    maximizable: false,
    backgroundColor: '#0b0b0d',
    show: false,
    title: 'HOVR Setup',
    icon: join(__dirname, 'icon.png'),
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true }
  })
  win.setMenuBarVisibility(false)
  win.loadFile(join(__dirname, 'index.html'))
  win.once('ready-to-show', () => win.show())
}

if (!app.requestSingleInstanceLock()) app.quit()
app.whenReady().then(() => {
  ipcMain.handle('state', installedState)
  ipcMain.handle('install', result(doInstall))
  ipcMain.handle('uninstall', result(doUninstall))
  ipcMain.handle('launch', () => {
    spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref()
  })
  ipcMain.on('close', () => app.quit())
  ipcMain.on('minimize', () => win && win.minimize())
  createWindow()
})
app.on('window-all-closed', () => app.quit())
