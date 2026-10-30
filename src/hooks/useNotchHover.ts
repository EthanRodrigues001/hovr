/**
 * useNotchHover: open the notch when the cursor dwells on the collapsed pill,
 * close it when the cursor leaves the open card.
 *
 * The window is click-through while collapsed, so DOM pointer events never arrive.
 * Instead the main process streams the cursor position (relative to the window)
 * via `window:cursor`, and this hook hit-tests it against the rendered pill/card.
 *
 * Opening from the shortcut or tray starts a short grace period so the notch does
 * not close the instant it appears under a cursor that is somewhere else.
 */
import { useEffect } from 'react'
import { NOTCH } from '../../shared/notch'
import { edge } from '../lib/edge'
import { useStore } from '../store/appStore'

const DWELL_MS = 160
const CLOSE_DELAY_MS = 280
/** Settings has more to read and click; leave it open a little longer. */
const SETTINGS_CLOSE_DELAY_MS = 900
const TOGGLE_GRACE_MS = 3500
/** Slack around the visible notch before the cursor counts as having left. */
const PAD_X = 18
const PAD_BOTTOM = 14
/** After the close animation, hand clicks back to the desktop. */
const CLICK_THROUGH_DELAY_MS = 320

let notchEl: HTMLElement | null = null

/** The Notch component registers its visible element so hit-tests use real bounds. */
export function registerNotchElement(el: HTMLElement | null): void {
  notchEl = el
}

export function useNotchHover(): void {
  useEffect(() => {
    let dwellTimer: number | undefined
    let closeTimer: number | undefined
    let clickThroughTimer: number | undefined
    let graceUntil = 0

    const clear = (t: number | undefined) => {
      if (t !== undefined) window.clearTimeout(t)
    }

    const open = () => {
      clear(closeTimer)
      closeTimer = undefined
      clear(clickThroughTimer)
      clickThroughTimer = undefined
      void edge.setInteractive(true)
      useStore.getState().setOpen(true)
    }

    const close = () => {
      clear(closeTimer)
      closeTimer = undefined
      useStore.getState().setOpen(false)
      clear(clickThroughTimer)
      clickThroughTimer = window.setTimeout(() => {
        clickThroughTimer = undefined
        if (!useStore.getState().open) void edge.setInteractive(false)
      }, CLICK_THROUGH_DELAY_MS)
    }

    const scheduleClose = () => {
      if (closeTimer !== undefined) return
      const delay = useStore.getState().view !== 'usage' ? SETTINGS_CLOSE_DELAY_MS : CLOSE_DELAY_MS
      closeTimer = window.setTimeout(() => {
        closeTimer = undefined
        close()
      }, delay)
    }

    const cancelClose = () => {
      clear(closeTimer)
      closeTimer = undefined
    }

    const onCursor = ({ x, y, width }: { x: number; y: number; width: number }) => {
      const state = useStore.getState()
      const centre = width / 2

      if (!state.open) {
        // Arm on the collapsed pill (plus a little slack, and the strip above it).
        const rect = notchEl?.getBoundingClientRect()
        const left = rect ? rect.left : centre - NOTCH.collapsedWidth / 2
        const right = rect ? rect.right : centre + NOTCH.collapsedWidth / 2
        const bottom = rect ? rect.bottom : NOTCH.collapsedHeight
        const onPill = x >= left - 10 && x <= right + 10 && y >= -NOTCH.buffer && y <= bottom + 4
        if (onPill) {
          if (dwellTimer === undefined) {
            dwellTimer = window.setTimeout(() => {
              dwellTimer = undefined
              open()
            }, DWELL_MS)
          }
        } else {
          clear(dwellTimer)
          dwellTimer = undefined
        }
        return
      }

      // Open: stay while the cursor is over the card (or above it, off the screen top).
      if (Date.now() < graceUntil) return
      const rect = notchEl?.getBoundingClientRect()
      const inside = rect
        ? x >= rect.left - PAD_X && x <= rect.right + PAD_X && y <= rect.bottom + PAD_BOTTOM
        : true
      if (inside) cancelClose()
      else scheduleClose()
    }

    const offCursor = edge.onCursor(onCursor)

    const offToggle = edge.onToggle((forceOpen) => {
      const state = useStore.getState()
      const next = forceOpen ?? !state.open
      if (next) {
        graceUntil = Date.now() + TOGGLE_GRACE_MS
        open()
      } else {
        graceUntil = 0
        close()
      }
    })

    const offSettings = edge.onOpenSettings(() => {
      graceUntil = Date.now() + TOGGLE_GRACE_MS
      useStore.getState().openSettings()
      open()
    })

    return () => {
      offCursor()
      offToggle()
      offSettings()
      clear(dwellTimer)
      clear(closeTimer)
      clear(clickThroughTimer)
    }
  }, [])
}

/** Collapse programmatically (e.g. the close button). */
export function closeNotch(): void {
  useStore.getState().setOpen(false)
  window.setTimeout(() => {
    if (!useStore.getState().open) void edge.setInteractive(false)
  }, CLICK_THROUGH_DELAY_MS)
}
