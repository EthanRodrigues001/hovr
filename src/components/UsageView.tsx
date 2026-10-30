/**
 * The open notch's main view: one card per provider with its usage windows, then a
 * short list of tools that were detected but cannot show limits.
 */
import { useEffect, useMemo, useState } from 'react'
import type { ProviderStatus, UsageLimits } from '../../shared/usage'
import { limitsNotice, worstRemainingPercent } from '../../shared/usageMath'
import { useStore } from '../store/appStore'
import { ProviderRing } from './ProviderRing'
import { WindowRow } from './WindowRow'

function ago(iso: string | undefined, now: number): string {
  if (!iso) return ''
  const mins = Math.floor((now - Date.parse(iso)) / 60_000)
  if (!Number.isFinite(mins) || mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function ProviderCard({
  status,
  limits,
  now
}: {
  status: ProviderStatus
  limits: UsageLimits | undefined
  now: number
}) {
  const windows = limits?.windows ?? []
  return (
    <section className="pcard">
      <header className="pcard-head">
        <ProviderRing id={status.id} remaining={worstRemainingPercent(windows)} size={28} />
        <span className="pcard-name">{status.label}</span>
        {status.plan && <span className="pcard-plan">{status.plan}</span>}
        {status.account && <span className="pcard-account">{status.account}</span>}
        <span className="pcard-updated">{ago(limits?.checkedAt, now)}</span>
      </header>
      {windows.map((w) => (
        <WindowRow key={w.id} window={w} now={now} provider={status.id} />
      ))}
      {status.stale && <div className="pcard-warn">Showing the last reading. {status.lastError}</div>}
    </section>
  )
}

export function UsageView() {
  const providers = useStore((s) => s.providers)
  const usage = useStore((s) => s.usage)
  const openSettings = useStore((s) => s.openSettings)

  // Tick so countdowns and "updated" labels stay fresh while the card is open.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  const { live, attention, detected } = useMemo(() => {
    const active = providers.filter((p) => p.enabled && p.installed)
    const hasBars = (p: ProviderStatus) => (usage[p.id]?.windows.length ?? 0) > 0
    return {
      live: active.filter((p) => p.supportsLimits && hasBars(p)),
      attention: active.filter((p) => p.supportsLimits && !hasBars(p)),
      detected: active.filter((p) => !p.supportsLimits)
    }
  }, [providers, usage])

  if (providers.length > 0 && live.length + attention.length + detected.length === 0) {
    return (
      <div className="empty">
        <p>No supported AI tools found on this PC.</p>
        <p className="muted">Install Claude Code, Codex, Cursor or another supported tool and sign in.</p>
        <button className="btn" onClick={() => openSettings('providers')}>
          Open settings
        </button>
      </div>
    )
  }

  return (
    <div className="usage-list">
      {live.map((p) => (
        <ProviderCard key={p.id} status={p} limits={usage[p.id]} now={now} />
      ))}
      {attention.length > 0 && (
        <section className="pcard pcard-attention">
          <header className="pcard-head">
            <span className="pcard-name">Needs attention</span>
          </header>
          {attention.map((p) => {
            const limits = usage[p.id]
            const message = p.lastError ?? p.hint ?? (limits ? limitsNotice(limits) : null) ?? 'No limits reported.'
            return (
              <div key={p.id} className="attn-row" title={message}>
                <ProviderRing id={p.id} remaining={null} size={14} />
                <span className="attn-name">{p.label}</span>
                <span className="attn-msg">{message}</span>
              </div>
            )
          })}
        </section>
      )}
      {detected.length > 0 && (
        <div className="detected">
          Also found: {detected.map((p) => p.label).join(', ')} (no usage limits available)
        </div>
      )}
    </div>
  )
}
