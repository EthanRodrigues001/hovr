/**
 * Builds the installer people download:
 *   1. the app and its real (NSIS) installer, used silently and for auto-updates;
 *   2. the dark setup window (installer/) with that installer inside it.
 *   node scripts/build-installer.cjs
 * Output goes to %USERPROFILE%\hovr-dist (builds inside Documents fail with EPERM on some PCs).
 */
const { execSync } = require('node:child_process')
const { copyFileSync, mkdirSync, rmSync, readdirSync } = require('node:fs')
const { join } = require('node:path')
const os = require('node:os')

const root = join(__dirname, '..')
const out = process.env.HOVR_OUT || join(os.homedir(), 'hovr-dist')
const sh = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ELECTRON_RUN_AS_NODE: '' } })

rmSync(out, { recursive: true, force: true })
sh('npx electron-vite build')
sh(`npx electron-builder --win nsis -c.extraMetadata.buildTarget=github -c.directories.output="${join(out, 'app')}"`)

const nsis = readdirSync(join(out, 'app')).find((f) => /^HOVR-Setup-.*\.exe$/.test(f))
mkdirSync(join(root, 'installer', 'payload'), { recursive: true })
copyFileSync(join(out, 'app', nsis), join(root, 'installer', 'payload', 'payload.exe'))
copyFileSync(join(root, 'src', 'assets', 'logo.svg'), join(root, 'installer', 'logo.svg'))
copyFileSync(join(root, 'resources', 'icon.png'), join(root, 'installer', 'icon.png'))

sh(`npx electron-builder --win --projectDir installer --config electron-builder.json -c.directories.output="${join(out, 'setup')}"`)
console.log(`\nSetup: ${join(out, 'setup')}`)
