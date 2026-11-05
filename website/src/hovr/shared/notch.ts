/**
 * Notch geometry shared by the main process (window placement, cursor polling)
 * and the renderer (layout, hover hit-testing). Everything is in CSS pixels.
 *
 * The BrowserWindow is a fixed-size transparent canvas centred on the top edge of
 * the chosen display. The visible notch is drawn inside it: a small pill when
 * collapsed, a card when open. The window is click-through until the notch opens.
 */
export const NOTCH = {
  /** Transparent canvas size. Must fit the largest view (the settings sheet). */
  windowWidth: 1080,
  windowHeight: 760,
  /** Collapsed pill. */
  collapsedWidth: 268,
  collapsedHeight: 34,
  /** Usage card. */
  cardWidth: 640,
  cardMaxHeight: 690,
  /** Analytics modal. */
  analyticsWidth: 1040,
  analyticsHeight: 740,
  /** Settings sheet. */
  settingsWidth: 680,
  settingsHeight: 640,
  /** Cursor must be within this many px of the screen top to arm the hover. */
  triggerDepth: 3,
  /** ...and within this horizontal distance of the window centre. */
  triggerHalfSpan: 190,
  /** Forgiveness around edges, e.g. overshooting onto an adjacent monitor. */
  buffer: 30
} as const
