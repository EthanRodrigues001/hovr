/**
 * App: root component.
 *
 * Hydrates settings + usage from the main process, subscribes to the pushed
 * updates, drives the hover behaviour, and renders the notch.
 */
import { useEffect } from 'react'
import { Notch } from './components/Notch'
import { useNotchHover } from './hooks/useNotchHover'
import { edge } from './lib/edge'
import { applyReduceMotion } from './lib/theme'
import { useStore } from './store/appStore'

export default function App() {
  const reduceMotion = useStore((s) => s.settings.reduceMotion)

  useNotchHover()

  useEffect(() => {
    const { hydrate, setSettings, setUsageState, pushToast, setUpdateStatus } =
      useStore.getState()
    void hydrate()
    const offs = [
      edge.onSettings(setSettings),
      edge.onUsage(setUsageState),
      edge.onToast(pushToast),
      edge.onUpdateStatus(setUpdateStatus)
    ]
    return () => offs.forEach((off) => off())
  }, [])

  useEffect(() => applyReduceMotion(reduceMotion), [reduceMotion])

  return <Notch />
}
