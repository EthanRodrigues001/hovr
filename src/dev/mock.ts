/**
 * Dev-only visual harness: with `?mock=1` in the URL, the renderer runs against a
 * fake preload bridge with fixed sample data, so screens can be rendered and
 * screenshotted without the real app (see scripts/shot.cjs). Compiled out of
 * production builds.
 */
import type { EdgeApi } from '../../shared/bridge'
import { DEFAULT_SETTINGS } from '../../shared/types'
import type { ProviderStatus, UsageLimits, UsageState } from '../../shared/usage'

const params = new URLSearchParams(location.search)

function emptyState(): UsageState {
  const ids = ['claude', 'codex', 'cursor', 'antigravity', 'grok', 'opencode', 'muse', 'pi', 'copilot', 'gemini'] as const
  const labels: Record<string, string> = { claude: 'Claude Code', codex: 'Codex', cursor: 'Cursor', antigravity: 'Antigravity', grok: 'Grok', opencode: 'OpenCode', muse: 'Muse', pi: 'Pi', copilot: 'GitHub Copilot', gemini: 'Gemini CLI' }
  return {
    usage: {},
    providers: ids.map((id) => ({ id, label: labels[id], installed: false, authState: 'unknown' as const, enabled: true, supportsLimits: !['muse', 'pi', 'copilot', 'gemini'].includes(id) }))
  }
}

function sampleState(now = Date.now()): UsageState {
  if (params.get('mock') === 'empty') return emptyState()
  const iso = (ms: number) => new Date(now + ms).toISOString()
  const H = 3_600_000
  const D = 24 * H
  const limits = (windows: UsageLimits['windows']): UsageLimits => ({ checkedAt: iso(0), windows })
  const status = (id: ProviderStatus['id'], label: string, extra: Partial<ProviderStatus> = {}): ProviderStatus => ({
    id,
    label,
    installed: true,
    authState: 'authenticated',
    enabled: true,
    supportsLimits: true,
    checkedAt: iso(0),
    ...extra
  })
  return {
    usage: {
      claude: limits([
        { id: 'five_hour', kind: 'session', label: 'Session', usedPercent: 73, resetsAt: iso(3 * H), windowDurationMins: 300 },
        { id: 'seven_day', kind: 'weekly', label: 'Weekly', usedPercent: 30, resetsAt: iso(4.6 * D), windowDurationMins: 10080 }
      ]),
      codex: limits([{ id: 'monthly', kind: 'monthly', label: 'Monthly', usedPercent: 52, resetsAt: iso(18.8 * D), windowDurationMins: 31 * 1440 }]),
      antigravity: limits([
        { id: '3p-5h', kind: 'session', label: 'Claude & GPT (shared) · 5-hour', usedPercent: 0, resetsAt: iso(4.9 * H), windowDurationMins: 300 },
        { id: '3p-weekly', kind: 'weekly', label: 'Claude & GPT (shared) · Weekly', usedPercent: 0, resetsAt: iso(6.9 * D), windowDurationMins: 10080 }
      ])
    },
    providers: [
      status('claude', 'Claude Code', { plan: 'Pro' }),
      status('codex', 'Codex', { plan: 'Free', account: 'me@example.com' }),
      status('antigravity', 'Antigravity')
    ]
  }
}

if (import.meta.env.DEV && params.get('mock')) {
  const none = () => () => undefined
  const edge: EdgeApi = {
    loadState: async () => ({ settings: { ...DEFAULT_SETTINGS, ...(params.get('compact') ? { collapsedStyle: 'compact' as const } : {}) }, version: 'dev' }),
    installUpdate: async () => undefined,
    quitApp: async () => undefined,
    updateSettings: async (patch) => ({ ...DEFAULT_SETTINGS, ...patch }),
    setInteractive: async () => undefined,
    getDisplays: async () => [],
    getUsage: async () => sampleState(),
    refreshUsage: async () => sampleState(),
    getHistory: async (days) => {
      const DAY = 86_400_000
      const byDay = Array.from({ length: days }, (_, i) => {
        const d = new Date(Date.now() - (days - 1 - i) * DAY)
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const wave = 0.5 + 0.5 * Math.sin(i / 2.3)
        const claude = Math.round(40 * wave * (i % 6 === 5 ? 0.1 : 1) * 1e6)
        const codex = Math.round(3 * wave * 1e6)
        const agy = i % 4 === 0 ? Math.round(9 * wave * 1e6) : 0
        return {
          date,
          tokens: claude + codex + agy,
          costUsd: claude / 1e6 * 1.1 + codex / 1e6 * 0.4 + agy / 1e6 * 0.15,
          byProvider: { claude, codex, antigravity: agy },
          costByProvider: { claude: claude / 1e6 * 1.1, codex: codex / 1e6 * 0.4, antigravity: agy / 1e6 * 0.15 }
        }
      })
      const tokens = byDay.reduce((a, d) => a + d.tokens, 0)
      const cost = byDay.reduce((a, d) => a + (d.costUsd ?? 0), 0)
      const sum = (p: 'claude' | 'codex' | 'antigravity') => byDay.reduce((a, d) => a + (d.byProvider[p] ?? 0), 0)
      const sumC = (p: 'claude' | 'codex' | 'antigravity') => byDay.reduce((a, d) => a + (d.costByProvider[p] ?? 0), 0)
      return {
        generatedAt: new Date().toISOString(),
        days,
        totals: { input: tokens * 0.002, output: tokens * 0.004, cacheRead: tokens * 0.9, cacheWrite: tokens * 0.09, requests: Math.round(tokens / 2e5), costUsd: cost },
        byDay,
        byModel: [
          { provider: 'claude' as const, model: 'claude-opus-5', totals: { input: 1, output: 1, cacheRead: sum('claude') * 0.4, cacheWrite: 1, requests: 100 }, costUsd: sumC('claude') * 0.55 },
          { provider: 'claude' as const, model: 'claude-sonnet-5-5', totals: { input: 1, output: 1, cacheRead: sum('claude') * 0.6, cacheWrite: 1, requests: 200 }, costUsd: sumC('claude') * 0.45 },
          { provider: 'antigravity' as const, model: 'gemini-3-flash', totals: { input: 1, output: 1, cacheRead: sum('antigravity'), cacheWrite: 1, requests: 50 }, costUsd: sumC('antigravity') },
          { provider: 'codex' as const, model: 'gpt-5', totals: { input: 1, output: 1, cacheRead: sum('codex'), cacheWrite: 1, requests: 20 }, costUsd: sumC('codex') }
        ],
        byProvider: [
          { provider: 'claude' as const, requests: 900, tokens: sum('claude'), costUsd: sumC('claude') },
          { provider: 'antigravity' as const, requests: 300, tokens: sum('antigravity'), costUsd: sumC('antigravity') },
          { provider: 'codex' as const, requests: 50, tokens: sum('codex'), costUsd: sumC('codex') }
        ],
        costByType: { input: cost * 0.001, cacheRead: cost * 0.55, cacheWrite: cost * 0.25, output: cost * 0.2 },
        cacheSavingsUsd: cost * 8,
        heatmap: Array.from({ length: 7 }, () => new Array<number>(24).fill(0)),
        pricesAsOf: new Date().toISOString(),
        providersScanned: ['claude', 'codex', 'antigravity'] as Array<'claude' | 'codex' | 'antigravity'>
      }
    },
    getSamples: async () => [],
    onUsage: none,
    onSettings: none,
    onToggle: none,
    onOpenSettings: none,
    onCursor: none,
    onToast: none,
    onUpdateAvailable: none,
    onUpdateDownloaded: none
  }
  ;(window as unknown as { edge: EdgeApi }).edge = edge

  const view = params.get('view')
  if (view) {
    void import('../store/appStore').then(({ useStore }) => {
      const tab = params.get('tab')
      const set = () =>
        useStore.setState({
          open: true,
          view: view as 'usage' | 'settings' | 'analytics',
          ...(tab && view === 'analytics' ? { analyticsTab: tab as 'forecast' | 'spend' | 'timeline' } : {}),
          ...(tab && view === 'settings' ? { settingsTab: tab as 'providers' | 'general' | 'about' } : {})
        })
      set()
      setTimeout(set, 400) // after hydrate()
    })
  }
}
