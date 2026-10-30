/**
 * General tab: how the notch looks and behaves. Everything applies immediately.
 */
import { useEffect, useState } from 'react'
import type { CollapsedStyle, DisplayInfo } from '../../../shared/types'
import { edge } from '../../lib/edge'
import { useStore } from '../../store/appStore'
import { Row, Segmented, Switch } from '../ui'

const INTERVALS = [1, 5, 10, 15, 30] as const

export function GeneralTab() {
  const settings = useStore((s) => s.settings)
  const patch = useStore((s) => s.patchSettings)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])

  useEffect(() => {
    void edge.getDisplays().then(setDisplays)
  }, [])

  const current = displays.find((d) => d.isCurrent)

  return (
    <div className="tab-body">
      <div className="tab-head">
        <div>
          <h2>General</h2>
          <p className="muted">How the notch looks and behaves.</p>
        </div>
      </div>

      <Row title="Collapsed notch" hint="What the small pill shows before you hover it.">
        <Segmented<CollapsedStyle>
          value={settings.collapsedStyle}
          onChange={(collapsedStyle) => void patch({ collapsedStyle })}
          options={[
            { value: 'chips', label: 'Percentages' },
            { value: 'dots', label: 'Dots' }
          ]}
        />
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

      <Row title="Ignore hover in fullscreen" hint="Never pop up over games or fullscreen video.">
        <Switch
          checked={settings.suppressInFullscreen}
          onChange={(suppressInFullscreen) => void patch({ suppressInFullscreen })}
          label="Ignore hover in fullscreen"
        />
      </Row>

      <Row title="Dollar estimates in History" hint="Downloads a public price list once a day. Off shows token counts only.">
        <Switch
          checked={settings.showCostEstimates}
          onChange={(showCostEstimates) => void patch({ showCostEstimates })}
          label="Dollar estimates in History"
        />
      </Row>

      <Row title="Reduce motion" hint="Skip the open and close animations.">
        <Switch checked={settings.reduceMotion} onChange={(reduceMotion) => void patch({ reduceMotion })} label="Reduce motion" />
      </Row>

      <Row title="Start with Windows">
        <Switch checked={settings.launchAtLogin} onChange={(launchAtLogin) => void patch({ launchAtLogin })} label="Start with Windows" />
      </Row>
    </div>
  )
}
