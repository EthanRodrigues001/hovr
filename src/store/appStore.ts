/**
 * Renderer state store (Zustand).
 *
 * The main process is the source of truth for settings and usage; the renderer
 * mostly applies what it is pushed and keeps view state (open, which view/tab).
 */
import { create } from 'zustand'
import { edge } from '../lib/edge'
import type { Settings } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/types'
import type { ProviderId, ProviderStatus, UsageLimits, UsageState } from '../../shared/usage'

/** A transient user-facing notice shown as a toast. */
export interface ToastMsg {
  id: string
  message: string
  tone: 'info' | 'error'
}

export type View = 'usage' | 'settings'
export type SettingsTab = 'providers' | 'history' | 'general' | 'about'

interface AppState {
  settings: Settings
  version: string
  /** True until the first `state:load` resolves. */
  hydrated: boolean

  usage: Partial<Record<ProviderId, UsageLimits>>
  providers: ProviderStatus[]
  /** True while a manual refresh is in flight. */
  refreshing: boolean

  /** Whether the notch is expanded. */
  open: boolean
  view: View
  settingsTab: SettingsTab

  toasts: ToastMsg[]
  updateInfo: { latestVersion: string; downloaded: boolean } | null

  hydrate: () => Promise<void>
  setSettings: (next: Settings) => void
  patchSettings: (patch: Partial<Settings>) => Promise<void>
  setUsageState: (state: UsageState) => void
  refresh: () => Promise<void>

  setOpen: (open: boolean) => void
  openSettings: (tab?: SettingsTab) => void
  showUsage: () => void
  setSettingsTab: (tab: SettingsTab) => void

  pushToast: (toast: ToastMsg) => void
  dismissToast: (id: string) => void

  setUpdateAvailable: (info: { version: string }) => void
  setUpdateDownloaded: (info: { version: string }) => void
  installUpdate: () => Promise<void>
}

const TOAST_MS = 3500

export const useStore = create<AppState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  version: '',
  hydrated: false,

  usage: {},
  providers: [],
  refreshing: false,

  open: false,
  view: 'usage',
  settingsTab: 'providers',

  toasts: [],
  updateInfo: null,

  async hydrate() {
    const [{ settings, version }, usage] = await Promise.all([edge.loadState(), edge.getUsage()])
    set({ settings, version, usage: usage.usage, providers: usage.providers, hydrated: true })
  },

  setSettings: (next) => set({ settings: next }),

  async patchSettings(patch) {
    // Optimistic: the UI reflects the change immediately; main's reply is authoritative.
    set((s) => ({ settings: { ...s.settings, ...patch } }))
    set({ settings: await edge.updateSettings(patch) })
  },

  setUsageState: (state) => set({ usage: state.usage, providers: state.providers }),

  async refresh() {
    if (get().refreshing) return
    set({ refreshing: true })
    try {
      const state = await edge.refreshUsage()
      set({ usage: state.usage, providers: state.providers })
    } finally {
      set({ refreshing: false })
    }
  },

  setOpen: (open) => set(open ? { open } : { open, view: 'usage' }),
  openSettings: (tab) => set({ open: true, view: 'settings', ...(tab ? { settingsTab: tab } : {}) }),
  showUsage: () => set({ view: 'usage' }),
  setSettingsTab: (settingsTab) => set({ settingsTab }),

  pushToast: (toast) => {
    set((s) => ({ toasts: [...s.toasts.filter((t) => t.id !== toast.id), toast] }))
    setTimeout(() => get().dismissToast(toast.id), TOAST_MS)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setUpdateAvailable: (info) => set({ updateInfo: { latestVersion: info.version, downloaded: false } }),
  setUpdateDownloaded: (info) => set({ updateInfo: { latestVersion: info.version, downloaded: true } }),
  installUpdate: () => edge.installUpdate()
}))
