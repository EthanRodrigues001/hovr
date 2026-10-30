/**
 * Settings sheet: the notch's "modal". A sidebar of tabs on the left, content on the
 * right. Providers is where tools are connected / switched off; General holds the
 * notch behaviour; About holds version, update and privacy notes.
 */
import { ArrowLeft, Info, Plug, SlidersHorizontal, X, type LucideIcon } from 'lucide-react'
import { closeNotch } from '../hooks/useNotchHover'
import { type SettingsTab, useStore } from '../store/appStore'
import { AboutTab } from './settings/AboutTab'
import { GeneralTab } from './settings/GeneralTab'
import { ProvidersTab } from './settings/ProvidersTab'

const TABS: ReadonlyArray<{ id: SettingsTab; label: string; Icon: LucideIcon }> = [
  { id: 'providers', label: 'Providers', Icon: Plug },
  { id: 'general', label: 'General', Icon: SlidersHorizontal },
  { id: 'about', label: 'About', Icon: Info }
]

export function SettingsSheet() {
  const tab = useStore((s) => s.settingsTab)
  const setTab = useStore((s) => s.setSettingsTab)
  const showUsage = useStore((s) => s.showUsage)

  return (
    <div className="layer sheet">
      <nav className="sheet-nav">
        <button className="back-btn" onClick={showUsage}>
          <ArrowLeft size={14} />
          Usage
        </button>
        <div className="sheet-title">Settings</div>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>
      <div className="sheet-main">
        <button className="icon-btn sheet-close" onClick={closeNotch} title="Close" aria-label="Close">
          <X size={15} />
        </button>
        <div className="sheet-scroll">
          {tab === 'providers' && <ProvidersTab />}
          {tab === 'general' && <GeneralTab />}
          {tab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  )
}
