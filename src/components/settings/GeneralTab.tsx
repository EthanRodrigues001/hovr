/**
 * General tab: how the notch looks and behaves. Everything applies immediately.
 */
import { useEffect, useState } from 'react'
import type { CollapsedStyle, DisplayInfo } from '../../../shared/types'
import type { ProviderId } from '../../../shared/usage'
import { edge } from '../../lib/edge'
import { useStore } from '../../store/appStore'
import { Row, Segmented, Switch } from '../ui'
import { ProviderPicker } from '../ProviderPicker'
import { PROVIDER_META } from '../../lib/providers'

const INTERVALS = [1, 5, 10, 15, 30] as const

export function GeneralTab() {
  const settings = useStore((s) => s.settings)
  const patch = useStore((s) => s.patchSettings)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])

  useEffect(() => {
    void edge.getDisplays().then(setDisplays)
  }, [])

  const current = displays.find((d) => d.isCurrent)
  const providers = useStore((s) => s.providers)
  const pillable = providers.filter((p) => p.enabled && p.installed && p.supportsLimits)
  const hidden = new Set(settings.pillHidden as ProviderId[])
  const togglePill = (id: ProviderId) => {
    const next = new Set(hidden)
    if (next.has(id)) next.delete(id)
    else if (pillable.filter((p) => !next.has(p.id)).length > 1) next.add(id) // keep at least one on
    void patch({ pillHidden: [...next] })
  }

  return (
    <div className="tab-body">
      <div className="tab-head">
        <div>
          <h2>General</h2>
          <p className="muted">How the notch looks and behaves.</p>
        </div>
      </div>

      <h3 className="sgroup">Notch</h3>
      <Row title="Collapsed notch" hint="Percentages beside each ring, or just the number inside it.">
        <Segmented<CollapsedStyle>
          value={settings.collapsedStyle}
          onChange={(collapsedStyle) => void patch({ collapsedStyle })}
          options={[
            { value: 'chips', label: 'Percentages' },
            { value: 'compact', label: 'Compact' }
          ]}
        />
      </Row>

      {pillable.length > 1 && (
        <Row title="Tools in the notch" hint="Pick which tools the collapsed notch shows, one or all. At least one stays on.">
          <ProviderPicker
            items={pillable.map((p) => ({ id: p.id, name: PROVIDER_META[p.id].short }))}
            hidden={hidden}
            onToggle={togglePill}
            allLabel="All tools"
          />
        </Row>
      )}

      <Row title="Ignore hover in fullscreen" hint="Never pop up over games or fullscreen video.">
        <Switch
          checked={settings.suppressInFullscreen}
          onChange={(suppressInFullscreen) => void patch({ suppressInFullscreen })}
          label="Ignore hover in fullscreen"
        />
      </Row>

      <Row title="Reduce motion" hint="Skip the open and close animations.">
        <Switch checked={settings.reduceMotion} onChange={(reduceMotion) => void patch({ reduceMotion })} label="Reduce motion" />
      </Row>

      <h3 className="sgroup">Usage data</h3>
      <Row title="Alerts" hint="A notification when a limit is nearly used up or will run out before it resets.">
        <button className="btn btn-ghost" onClick={() => void edge.testAlert()}>
          Send test
        </button>
        <Switch checked={settings.notifications} onChange={(notifications) => void patch({ notifications })} label="Alerts" />
      </Row>

      <Row title="Refresh every" hint="How often usage is re-read in the background.">
        <Segmented<number>
          value={settings.usageRefreshMinutes}
          onChange={(usageRefreshMinutes) => void patch({ usageRefreshMinutes })}
          options={INTERVALS.map((m) => ({ value: m, label: `${m}m` }))}
        />
      </Row>

      {displays.length > 1 && (
        <Row title="Show on display" hint={current ? `Now: ${current.name}` : undefined}>
          <Segmented<number>
            value={current?.id ?? displays[0].id}
            onChange={(stickDisplayId) => void patch({ stickDisplayId })}
            options={displays.map((d, i) => ({ value: d.id, label: d.isPrimary ? 'Primary' : `Display ${i + 1}` }))}
          />
        </Row>
      )}

      <Row title="Dollar estimates in Analytics" hint="Downloads a public price list once a day. Off shows token counts only.">
        <Switch
          checked={settings.showCostEstimates}
          onChange={(showCostEstimates) => void patch({ showCostEstimates })}
          label="Dollar estimates in Analytics"
        />
      </Row>

      <h3 className="sgroup">System</h3>
      <Row title="Start with Windows" hint="Launch hovr when you sign in.">
        <Switch checked={settings.launchAtLogin} onChange={(launchAtLogin) => void patch({ launchAtLogin })} label="Start with Windows" />
      </Row>
    </div>
  )
}
