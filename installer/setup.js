const view = document.getElementById('view')
const api = window.setup
document.getElementById('close').onclick = () => api.close()
document.getElementById('min').onclick = () => api.minimize()

const logo = '<img class="logo" src="logo.svg" alt="" />'
const render = (html) => {
  view.innerHTML = html
}
const on = (id, fn) => {
  document.getElementById(id).onclick = fn
}
const wait = (ms) => new Promise((res) => setTimeout(res, ms))

function welcome() {
  render(`${logo}<h1>HOVR</h1>
    <p>Your AI tools' usage limits, in a notch at the top of your screen.</p>
    <div class="actions"><button class="btn primary" id="go">Install</button></div>
    <div class="fine">Installs for your account only. No admin rights needed.</div>`)
  on('go', () => install('Installing'))
}

function already(version) {
  render(`${logo}<h1>HOVR</h1>
    <p>HOVR${version ? ` ${version}` : ''} is already installed on this PC. What would you like to do?</p>
    <div class="actions"><button class="btn primary" id="re">Reinstall</button><button class="btn danger" id="un">Uninstall</button></div>`)
  on('re', () => install('Reinstalling'))
  on('un', confirmUninstall)
}

function confirmUninstall() {
  render(`${logo}<h1>Uninstall HOVR?</h1>
    <p>This removes HOVR from your PC. Your settings are kept in case you install it again.</p>
    <div class="actions"><button class="btn" id="no">Cancel</button><button class="btn danger" id="yes">Uninstall</button></div>`)
  on('no', init)
  on('yes', uninstall)
}

/** The installer reports no percentage, so the bar eases towards 92% and jumps to full when it finishes. */
function progress(title, note) {
  render(`${logo}<h1>${title}</h1><p id="note">${note}</p><div class="meter"><i id="fill"></i></div>`)
  const fill = document.getElementById('fill')
  let pct = 4
  fill.style.width = `${pct}%`
  const t = setInterval(() => {
    pct += (92 - pct) * 0.06
    fill.style.width = `${pct.toFixed(1)}%`
  }, 500)
  return {
    done: () => {
      clearInterval(t)
      fill.style.width = '100%'
    },
    stop: () => clearInterval(t)
  }
}

async function install(title) {
  const p = progress(title, 'Closing HOVR if it is running')
  api.onPhase((ph) => {
    if (ph === 'installing') document.getElementById('note').textContent = 'Copying files. This takes a moment.'
  })
  const r = await api.install()
  if (!r.ok) {
    p.stop()
    return failed('Setup could not finish.', r.error)
  }
  p.done()
  await wait(400)
  await api.launch()
  render(`${logo}<h1>HOVR is ready</h1><p>It is running now. Look for it at the top of your screen and in the system tray.</p>
    <div class="actions"><button class="btn primary" id="x">Done</button></div>`)
  on('x', () => api.close())
  setTimeout(() => api.close(), 6000)
}

async function uninstall() {
  const p = progress('Uninstalling', 'Removing HOVR')
  const r = await api.uninstall()
  if (!r.ok) {
    p.stop()
    return failed('Could not uninstall.', r.error)
  }
  p.done()
  await wait(500)
  render(`${logo}<h1>HOVR was removed</h1><p>You can install it again any time.</p>
    <div class="actions"><button class="btn primary" id="x">Close</button></div>`)
  on('x', () => api.close())
}

function failed(title, detail) {
  render(`${logo}<h1>${title}</h1><p>Close anything using HOVR and try again.</p><div class="err">${String(detail || '').replace(/</g, '&lt;')}</div>
    <div class="actions"><button class="btn" id="x">Close</button><button class="btn primary" id="again">Try again</button></div>`)
  on('x', () => api.close())
  on('again', init)
}

async function init() {
  const s = await api.state()
  if (s.installed) already(s.version)
  else welcome()
}
init()
