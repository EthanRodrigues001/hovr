/**
 * Providers tab: every tool hovr knows about, its detected state, an on/off switch,
 * a "Test" action, and (expandable) exactly what it reads and where it talks.
 * Detection is automatic; there is nothing to "add".
 */
import { ChevronDown, FlaskConical, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { ProviderStatus } from '../../../shared/usage'
import { worstRemainingPercent } from '../../../shared/usageMath'
import { PROVIDER_SOURCE } from '../../lib/providers'
import { useStore } from '../../store/appStore'
import { ProviderRing } from '../ProviderRing'
import { Switch } from '../ui'

type Tone = 'ok' | 'warn' | 'muted'

function describe(p: ProviderStatus, hasBars: boolean): { tone: Tone; text: string } {
  if (!p.installed) return { tone: 'muted', text: 'Not installed' }
  if (!p.supportsLimits) return { tone: 'muted', text: 'Detected · no usage limits available' }
  if (hasBars) {
    const parts = ['Connected', p.plan, p.account].filter(Boolean)
    return { tone: p.stale ? 'warn' : 'ok', text: parts.join(' · ') + (p.stale ? ' · last read failed' : '') }
  }
  if (p.authState === 'unauthenticated') return { tone: 'warn', text: p.hint ?? 'Sign-in needed' }
  return { tone: 'warn', text: p.lastError ?? p.hint ?? 'No limits reported' }
}

function ProviderRow({ p }: { p: ProviderStatus }) {
  const usage = useStore((s) => s.usage[p.id])
  const patchSettings = useStore((s) => s.patchSettings)
  const disabled = useStore((s) => s.settings.disabledProviders)
  const refresh = useStore((s) => s.refresh)
  const pushToast = useStore((s) => s.pushToast)
  const [open, setOpen] = useState(false)
  const [testing, setTesting] = useState(false)

  const hasBars = (usage?.windows.length ?? 0) > 0
  const { tone, text } = describe(p, hasBars)

  const toggle = (enabled: boolean) => {
    const next = enabled ? disabled.filter((id) => id !== p.id) : [...new Set([...disabled, p.id])]
    void patchSettings({ disabledProviders: next })
  }

  const test = async () => {
    setTesting(true)
    try {
      await refresh()
      const state = useStore.getState()
      const status = state.providers.find((x) => x.id === p.id)
      const windows = state.usage[p.id]?.windows ?? []
      const worst = worstRemainingPercent(windows)
      const id = `test-${p.id}`
      if (windows.length > 0 && !status?.stale) {
        state.pushToast({ id, tone: 'info', message: `${p.label}: ${worst}% left on the tightest limit.` })
      } else {
        state.pushToast({ id, tone: 'error', message: `${p.label}: ${status?.lastError ?? status?.hint ?? 'no limits reported'}` })
      }
    } catch {
      pushToast({ id: `test-${p.id}`, tone: 'error', message: `${p.label}: test failed.` })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className={`prow ${p.enabled ? '' : 'prow-off'}`}>
      <div className="prow-main">
        <ProviderRing id={p.id} remaining={hasBars ? worstRemainingPercent(usage!.windows) : null} size={22} />
        <div className="prow-text">
          <div className="prow-name">{p.label}</div>
          <div className={`prow-status tone-${tone}`}>
            <span className="status-dot" />
            {text}
          </div>
        </div>
        {p.installed && p.supportsLimits && (
          <button className="btn btn-ghost" onClick={() => void test()} disabled={testing || !p.enabled} title="Read limits now">
            {testing ? <RefreshCw size={13} className="spin-icon" /> : <FlaskConical size={13} />}
            Test
          </button>
        )}
        <Switch checked={p.enabled} onChange={toggle} label={`Show ${p.label}`} />
        <button className={`icon-btn chev ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-label="Details" aria-expanded={open}>
          <ChevronDown size={15} />
        </button>
      </div>
      {open && (
        <div className="prow-detail">
          <p>{PROVIDER_SOURCE[p.id]}</p>
          {p.lastError && <p className="tone-warn">Last message: {p.lastError}</p>}
          {p.hint && !p.lastError && <p>{p.hint}</p>}
        </div>
      )}
    </div>
  )
}

export function ProvidersTab() {
  const providers = useStore((s) => s.providers)
  const usage = useStore((s) => s.usage)
  const refreshing = useStore((s) => s.refreshing)
  const refresh = useStore((s) => s.refresh)

  const has = (p: ProviderStatus) => (usage[p.id]?.windows.length ?? 0) > 0
  const connected = providers.filter((p) => p.installed && p.supportsLimits && has(p))
  const attention = providers.filter((p) => p.installed && p.supportsLimits && !has(p))
  const detected = providers.filter((p) => p.installed && !p.supportsLimits)
  const missing = providers.filter((p) => !p.installed)

  const group = (title: string, list: ProviderStatus[]) =>
    list.length > 0 && (
      <section className="pgroup">
        <h3>{title}</h3>
        {list.map((p) => (
          <ProviderRow key={p.id} p={p} />
        ))}
      </section>
    )

  return (
    <div className="tab-body">
      <div className="tab-head">
        <div>
          <h2>Providers</h2>
          <p className="muted">hovr finds supported AI tools on this PC and reads their usage automatically. No keys to paste.</p>
        </div>
        <button className="btn" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? 'spin-icon' : ''} />
          Rescan
        </button>
      </div>
      {group('Connected', connected)}
      {group('Needs attention', attention)}
      {group('Detected, no limits', detected)}
      {group('Not installed', missing)}
    </div>
  )
}
