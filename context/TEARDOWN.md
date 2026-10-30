# Teardown plan

Forked from Edge-Drop v0.2.2 (`upstream-baseline` tag). Edge-Drop is a clipboard
manager; hovr keeps its shell and motion layer and replaces the clipboard with a
metrics widget shelf.

`git diff upstream-baseline` always shows everything we've changed.

## Rule

Strip in dependency order — leaves first, then the things that imported them. After each
step the app must still build and run. Never delete and "fix it later."

---

## KEEP — this is why we forked

The edge-docked window, the hover interaction, and the motion/styling system.

| File | Lines | What it gives us |
|---|---:|---|
| `src/hooks/useEdgeHover.ts` | 450 | **The hover trigger.** Enter/leave detection, dwell timing, retraction. |
| `electron/main/window.ts` | 550 | Edge-docked always-on-top frameless window |
| `src/components/CopyIndicatorCurve.tsx` | 338 | **The gooey nub.** SVG curve that morphs on hover. Rename to something neutral. |
| `src/components/IndicatorStyleFlyout.tsx` | 255 | Nub appearance controls |
| `src/lib/soundEffects.ts` | 212 | Web Audio haptic click suite |
| `electron/main/geometry.ts` | 122 | Edge + multi-monitor math, DPI |
| `src/components/LiquidOctopusLoader.tsx` | 103 | Liquid loader |
| `electron/main/fullscreen.ts` | 80 | Auto-hide over fullscreen apps |
| `src/hooks/useAdaptiveSpring.ts` | 58 | DPI-adaptive springs, reduced-motion aware |
| `src/styles/*.css` | ~1700 | Tokens, panel chrome, glass/blur |
| `electron/main/tray.ts` | 172 | Tray icon + menu |
| `src/lib/{theme,edge,format}.ts` | 66 | Small utilities |

## GUT — keep the file, replace the contents

These are shaped around clipboard items. Structure stays, payload changes.

| File | Lines | What changes |
|---|---:|---|
| `src/components/Settings.tsx` | 853 | Drop clipboard prefs, keep tabs/sliders/sound toggles |
| `src/components/Panel.tsx` | 461 | Shelf body — becomes a widget host instead of an item list |
| `src/store/appStore.ts` | 260 | Item state out, widget state in |
| `electron/main/ipc.ts` | 780 | Most channels are clipboard CRUD — delete those, add metrics |
| `shared/{ipc,types,bridge}.ts` | 387 | Contract follows ipc.ts |
| `src/Onboarding.tsx` | 332 | Copy is clipboard-specific |
| `electron/main/index.ts` | 164 | Drop clipboard watcher wiring |

## STRIP — clipboard-only, delete outright

Order matters: top rows have no dependents.

| # | Target | Lines | Notes |
|---:|---|---:|---|
| 1 | `src/lib/tryPaste.ts` | 15 | Leaf |
| 2 | `src/hooks/useDragOut.ts` | 20 | Leaf |
| 3 | `src/components/SearchBar.tsx` | 19 | Search over clipboard items |
| 4 | `src/components/EmptyState.tsx` | 19 | "No clips yet" |
| 5 | `src/lib/fileType.ts` | 74 | File-type icons for clips |
| 6 | `src/hooks/useFilteredItems.ts` | 84 | Item filtering |
| 7 | `electron/main/powershell.ts` | 98 | Verify first — may be used by paste only |
| 8 | `src/components/ItemList.tsx` | 242 | |
| 9 | `electron/main/drag.ts` | 354 | Drag clips out to Explorer |
| 10 | `electron/clipboard/ClipboardWatcher.ts` | 124 | The watcher itself |
| 11 | `electron/clipboard/formats.ts` | 321 | Clipboard format parsing |
| 12 | `src/components/PreviewFlyout.tsx` | 556 | Clip preview |
| 13 | `src/components/ClipboardItem.tsx` | 706 | The clip row |
| 14 | `electron/store/ItemStore.ts` | 592 | Clip persistence |
| 15 | `electron/store/{paths,ids}.ts` | 58 | Only used by ItemStore |

**~3,300 lines out.**

## Rebrand — text done, artwork outstanding

Text rename to HOVR is complete (session 3). Identity now lives in
[`shared/brand.ts`](../shared/brand.ts) — read from `BRAND` rather than hardcoding the
name or a URL again.

Still to do:

- **Raster assets are still Edge-Drop's artwork.** `resources/*.png`, `resources/icon.ico`,
  `public/Logo (4).png`, `public/Logo.gif`, `src/assets/wordmark.svg`. Regenerate from
  `src/assets/logo.svg`; `@resvg/resvg-js` is already a dependency.
- **`public/*.webm`** — ~8 MB of onboarding videos demoing clipboard features. All
  obsolete; delete with the onboarding rewrite.
- `electron/main/updater.ts` still assumes a GitHub release feed — wire to `BRAND.repoUrl`
  or remove.
- `edgelocal://` protocol name is unchanged (`config.ts`, `index.html` CSP, `index.ts`,
  `PreviewFlyout.tsx`). Deliberately left alone — it's internal, invisible to users, and
  the whole image-serving subsystem dies with the clipboard code. Renaming it now would
  risk the baseline run for no benefit.
- `build.publish` and `build.appx` were **removed**, not renamed — they carried upstream's
  release target and Microsoft Store publisher cert. Re-add with Ethan's own identity if
  he ever ships to the Store.

## Undecided

- `src/components/ChangelogView.tsx` (320) — Edge-Drop's changelog UI. Keep the
  component for hovr's own changelog, or drop it? Not clipboard-coupled either way.
- `electron/main/updater.ts` (75) — points at Edge-Drop's release feed. Repoint or remove.
- `scratch/`, `.github/`, `resources/` — upstream leftovers, audit before shipping.
- `FEATURES.md`, `features_and_architecture.md`, `README.md` — all describe the clipboard
  product. Rewrite or delete.

## Order of operations

1. **Baseline first.** `npm install`, run it, confirm Edge-Drop works as-is. Nothing gets
   deleted before we know what "working" looks like.
2. Strip rows 1-15 above, in order, verifying the build between steps.
3. Gut the GUT list down to a shelf that opens on hover and shows nothing.
4. Build the uptime/CPU widget into the empty shelf.
