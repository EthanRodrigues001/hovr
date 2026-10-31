/**
 * Pause / resume HOVR from the tray. Paused means: notch hidden, hover tracking and
 * usage polling stopped. It is a session-only switch, so a restart always starts on.
 */
import { runtime } from './config'
import { startCursorPoll, setVisible, stopCursorPoll } from './window'
import { startUsageService, stopUsageService } from './usageService'

export function setPaused(paused: boolean): void {
  if (runtime.paused === paused) return
  runtime.paused = paused
  if (paused) {
    stopCursorPoll()
    stopUsageService()
    setVisible(false)
  } else {
    setVisible(true)
    startCursorPoll()
    startUsageService()
  }
}
