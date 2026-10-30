# Progress

Running log of what happened, session by session. Newest at the bottom.

---

## 2026-08-02 — Session 1: project setup

**Done**
- Created `context/` and `reference/` folders
- Wrote [PROJECT.md](PROJECT.md), [DECISIONS.md](DECISIONS.md), this file, and
  [../reference/INDEX.md](../reference/INDEX.md)
- Confirmed trigger mechanic: small visible tab/nub

**State of the repo:** No code. No stack chosen. Not a git repo yet.

**Next:** Wait for Ethan's direction. He is planning before any implementation starts.

**Blocked on:** Stack decision — blocks reference gathering, since which GitHub repos are
worth pulling depends entirely on the framework.

---

## 2026-08-02 — Session 2: forked Edge-Drop into the root

**Done**
- Cloned [Edge-Drop](https://github.com/Deepender25/Edge-Drop) v0.2.2 into the project
  root (Ethan's call — not into `reference/`; this is the base, not study material)
- Confirmed Apache-2.0, wrote `NOTICE` recording the fork point and modification notice
- Tagged fork point `upstream-baseline` (5a7c907)
- Renamed remote `origin` → `upstream`, **push disabled** — no accidental pushes upstream
- Wrote [TEARDOWN.md](TEARDOWN.md): keep / gut / strip classification, ~3,300 lines to remove
- Stack is now settled by inheritance: Electron + React + TS + Vite

**State of the repo:** Full Edge-Drop source, unmodified except added `NOTICE`,
`context/`, `reference/`, `.claude/`. Dependencies **not** installed. Never run yet.

**Next:** Establish a working baseline — `npm install`, launch, confirm Edge-Drop runs on
this machine. Nothing gets deleted until we know what "working" looks like.

**Note:** `reference/` is now empty and arguably redundant — the fork is the reference.
Keeping it for genuinely third-party study code later.

---

## 2026-08-02 — Session 3: rebrand to HOVR

**Done**
- Renamed Edge-Drop → HOVR across 19 files. `NOTICE`, `LICENSE`, and `context/` are
  deliberately excluded — those must keep saying Edge-Drop; they're attribution and
  fork history, not branding.
- `package.json`: name `hovr`, version reset to 0.1.0, `productName` HOVR,
  appId `com.hovr.app`, NSIS shortcut/artifact renamed
- **Removed** `build.publish` (pointed at Deepender25/Edge-Drop releases) and the whole
  `build.appx` block (carried Deepender's Microsoft Store publisher cert
  `CN=55FECDC4-…`). Dropped `build:store` / `build:msix` scripts with it. Re-add with
  Ethan's own identity when there's a store presence.
- New [`shared/brand.ts`](../shared/brand.ts) — single source of truth for app name and
  repo URL. `repoUrl` is `null`; the feedback button, star prompt, and release-feed fetch
  all check it and hide/no-op rather than linking somewhere wrong.
- New [`src/components/Logo.tsx`](../src/components/Logo.tsx) — HOVR mark as a component
- Replaced `src/assets/logo.svg` with the HOVR mark

**Incident — encoding corruption, caught and fixed.** The first bulk rename used
PowerShell `Get-Content`/`Set-Content`, which round-tripped UTF-8 through the ANSI
codepage and mojibake'd every non-ASCII character in 14 files (`↗` → `â†—`, etc.).
Caught because `useEdgeHover.ts` showed 42 changed lines for a one-word rename. Reverted
via git and redone with `[IO.File]::ReadAllText/WriteAllText` + `UTF8Encoding($false)`.

**Lesson for future bulk edits in this repo:** never use `Get-Content`/`Set-Content` for
rewriting source. Use the .NET methods with an explicit no-BOM UTF-8 encoding, and sanity
check the diff size against the expected change.

**Still branded Edge-Drop — raster assets, not yet replaceable from the SVG:**
`resources/icon.ico`, `icon.png`, `tray.png`, `SplashScreen.png`, `Square150x150Logo.png`,
`Square44x44Logo.png`, `StoreLogo.png`, `Wide310x150Logo.png`, `public/Logo (4).png`,
`public/Logo.gif`, and `src/assets/wordmark.svg`. These are Deepender's artwork and must
be regenerated from the HOVR mark before any build ships. `@resvg/resvg-js` is already a
dependency and can rasterize the SVG.

**Not verified:** dependencies still aren't installed, so none of this is typechecked or
run. The JSX changes in `Settings.tsx` and the new import in `ipc.ts` are unproven.

**Next:** `npm install`, then `npm run typecheck`, then launch.

---

## 2026-08-02 — Session 4: phases 0–3 (metrics widget + clipboard teardown)

**Phase 0 — baseline.** `npm install` + typecheck clean. Ethan confirmed the app runs
and the shelf works. Two false alarms on my side worth recording so they aren't re-chased:

- Electron failed to boot **in the assistant's sandbox only** with a CJS/ESM translator
  error. A minimal 3-line ESM Electron app failed identically there, so it was the
  environment, never the repo. Ethan's `npm run dev` worked throughout.
- Chasing that, koffi/`@resvg/resvg-js` were converted to lazy `createRequire` imports.
  Harmless (Resvg loads fine on Ethan's machine) and both files were deleted in phase 3
  anyway, so the change is gone.

**Phase 1 — contract.** `MetricsDto` in `shared/types.ts`; `metrics:subscribe` (invoke)
and `metrics:tick` (event) in `shared/ipc.ts`; bridge + preload wired.

**Phase 2 — vertical slice.** New `electron/main/metrics.ts` (zero deps, `node:os`),
`src/hooks/useMetrics.ts`, `src/components/Widgets.tsx`, `src/styles/widgets.css`.
Uptime + CPU render in the blade. Sampling is gated on `open` per the roadmap's
on-demand/continuous split — nothing polls while the shelf is retracted.

**Phase 3 — teardown.** Clipboard removed. Main bundle **117 kB → 47 kB**.

Deleted: `electron/clipboard/`, `ItemStore.ts`, `ids.ts`, `drag.ts`, `ClipboardItem.tsx`,
`ItemList.tsx`, `PreviewFlyout.tsx`, `SearchBar.tsx`, `EmptyState.tsx`,
`useFilteredItems.ts`, `useDragOut.ts`, `tryPaste.ts`, `item.css`, 7 `.webm` videos (6.3 MB).

Gutted: `state.ts` (195→44), `ipc.ts` (881→~330), `Panel.tsx` (501→~250),
`Header.tsx` (219→142, filter chips replaced with the HOVR mark), `appStore.ts`,
`index.ts` (edgelocal:// protocol removed), `useEdgeHover.ts` (OS-drag block removed).

**TEARDOWN.md was wrong on three files** — all three are keepers, verified by grep before
deleting: `store/paths.ts` (tray/window/index), `lib/fileType.ts` (icons.tsx),
`main/powershell.ts` (fullscreen.ts).

**Fixed a real upstream bug:** `tutorial:set-step` was declared in the contract and sent
by the renderer, but nothing in main ever handled it — the panel silently ignored every
tutorial step change. Now bridged in `registerSendListeners`.

**Onboarding disabled** — every slide taught a clipboard feature and its videos are gone.
`createOnboardingWindow()` and its plumbing still work; re-enable with HOVR slides.

**Verified:** `npm run typecheck` and `npm run build` both clean. **Not verified:** the
shelf rendering live — awaiting Ethan.

**Still to do:** `shared/types.ts` still carries `ClipboardItemDto` / `ItemData` /
`TypeFilter` / `MAX_STACK`; `Settings` still has clipboard keys (`incognito`,
`historyLimit`, `autoDeleteHours`, `clearUnpinnedOnRestart`) surfaced in `Settings.tsx`;
`store/paths.ts` still exposes unused `imagesDir`/`tempDir`; raster icons are still
Edge-Drop artwork; `updater.ts` still wants `dev-app-update.yml`.

---

## 2026-08-02 — Session 5: screen time (roadmap phase 5)

Ethan confirmed the shelf renders uptime + CPU live. Built screen time next — the first
**continuous** widget, which exercises the other half of the widget architecture.

New `electron/main/screenTime.ts`. Runs from app start to quit, independent of the shelf.
Exposed through `MetricsDto.screenTimeSec`, so the shelf only reads a total main has been
keeping all along. `powerMonitor` wraps `GetLastInputInfo` — still zero native deps.

**The four things that make this correct**, each of which fails silently if wrong:

1. **Boundary at `lastInput`, not detection time.** When idle, credit stops at the last
   real input, not at the poll that noticed. Flipping state at detection would credit the
   entire 3-minute threshold as active on every break — ten breaks a day is half an hour
   of phantom time, and it only ever inflates.
2. **Local midnight, not UTC.** `toISOString()` would roll over at 5:30am for UTC+5:30,
   splitting a late-night session across two days.
3. **Suspend discarded.** A wall-clock gap over 3× the poll interval means the process was
   frozen; that interval is dropped rather than credited. Polling alone cannot see a
   suspend — the process simply resumes with a large gap.
4. **`locked` is not screen time**, even though `getSystemIdleState` reports it separately
   from `idle`.

Settings: 3-minute idle threshold (ActivityWatch's long-standing default), 5s poll,
persisted to `userData/screen-time.json` every 30s and flushed on quit/suspend/lock.

**Verified:** typecheck + build clean. **Not verified:** accumulation accuracy over a real
day, midnight rollover, and suspend behaviour — all need wall-clock time to observe.

---

## 2026-08-03 — Session 6: volume + brightness sliders

Controls, not readouts — I'd wrongly filed these as "duplicates the tray". The tray shows
state; adjusting it costs a click-then-drag. A screen-edge slider is genuinely faster.

New `electron/main/controls.ts` + `src/components/Controls.tsx` + `controls.css`.
`psHost.run()` now **captures stdout** (it was fire-and-forget) so values can be read back.

**Volume** — IAudioEndpointVolume COM via a C# shim, `Add-Type`'d **once** and kept
resident in the persistent PowerShell session. Per-call spawn would cost 200-500 ms and
make dragging unusable; against the live host a set is single-digit ms.

**Brightness** — WMI `WmiMonitorBrightnessMethods`. **Laptop internal panels only.**
Desktops and external monitors don't implement these classes; that needs DDC/CI over I2C,
a different and much flakier mechanism. `null` is therefore a normal answer, not an
error, and the renderer omits the slider entirely rather than showing a dead control.

**Feel:** the thumb is driven by local state and only *mirrors* to the system on a 60 ms
throttle, with a guaranteed final write on release. Awaiting each IPC round-trip before
moving the thumb would feel like dragging through mud — the visual leads, the system
follows. Reused the existing `sliderActive` flag so a drag that strays outside the blade
doesn't retract the shelf ([useEdgeHover.ts:156,175,234](../src/hooks/useEdgeHover.ts)).

Dragging up from zero implicitly unmutes — otherwise the thumb moves and no sound comes
out, which reads as broken.

**Confirmed working on hardware** after two bugs, both mine, both initially silent:

1. **Multi-line scripts don't survive `psHost`.** The host keeps stdin open, so PowerShell
   parses incrementally and tears apart any multi-line construct. The audio shim is now a
   single line with the C# passed as base64. **Every `psHost` caller must be one line** —
   the pre-existing clipboard callers all used `[...].join(';')` and I missed the pattern.
2. **`WmiSetBrightness` is an instance method.** Calling it on the class gives
   `MethodNotFound`. Also `Get-CimInstance` returns a `CimInstance` with no callable
   methods — the dotted form only works on `Get-WmiObject`'s `ManagementObject`, which
   doesn't exist in PowerShell 7. Now `Invoke-CimMethod -InputObject`. Arg types are
   load-bearing: `[byte]`, not `[uint8]` (no such accelerator); a mismatch reports the
   unhelpful "Invalid method Parameter(s)".

**The thing that actually unblocked this:** `psHost` spawned with `stdio[2] = 'ignore'`,
so every PowerShell failure was invisible — a broken script still printed the completion
sentinel, so callers saw a clean run with empty output. Changing it to `'pipe'` with the
stderr logged turned two rounds of guessing into two exact error messages. That silence
was pre-existing and would have swallowed clipboard failures too.

**Wrong diagnosis worth remembering:** brightness was blamed on hardware ("desktops don't
support WMI brightness") when the *read* had been working all along — the slider only
appeared because `getBrightness` succeeded. A `null` return looks identical whether the
panel is unsupported or the query is malformed. Check the error before the hardware.

---

## 2026-10-30 — Session 7: widgets removed, pivot to usage-limits notch

Ethan is remaking hovr: a tab/notch at the **top** of the screen showing AI-tool usage
limits (Claude, Codex, etc.). He will specify how; nothing new decided yet.

**Removed** (all were untracked, so not recoverable from git): `Widgets.tsx`, `Controls.tsx`,
`useMetrics.ts`, `widgets.css`, `controls.css`, `metrics.ts`, `screenTime.ts`, `controls.ts`,
plus their IPC channels, preload/bridge entries, `MetricsDto` / `ControlsDto`, and store state.

**Kept:** the edge tab + hover/retract mechanics, `psHost` (now captures stdout/stderr, used by
fullscreen detection), tray, settings, updater. The panel body is now empty.

**Not done:** the edge is still left/right (not top). Typecheck clean; not launched.

---

## 2026-10-30 — Session 7b: T3 cloned, plan written

Cloned [T3 Code](https://github.com/pingdotgg/t3code) (MIT, `32ecd71`) into `reference/t3code`,
logged in `reference/INDEX.md`. Read its usage-limits stack end to end (providers, contracts,
shared math, usage/settings UI). Full plan with per-phase T3 references and open decisions:
[PLAN.md](PLAN.md). **No code written; no decisions made.** Next: Ethan answers PLAN §2.

## Session 7c
- Ethan asked for every provider T3 supports. Read T3 `packages/provider-{cursor,grok,opencode,pi,muse,fx,acp-registry}`.
- PLAN.md: added §1j (provider table with endpoints/auth paths/window shapes), Phase 4b, updated §2 decision 1. No code written. Fx unread; Muse/Pi have no pollable limits found.

## Session 8 — Phase 1 done
- Added shared/usage.ts (types), shared/usageMath.ts (clamp/sort/merge/resolveAfterProbe/pace/format), tests/usageMath.test.ts (22 tests pass). Used existing vitest (already a devDependency, config includes tests/**), no new deps. Typecheck clean.
- tests/geometry.test.ts has 4 failures that predate this work (geometry.ts untouched; Edge-Drop-era tests vs left/right assumptions) — to revisit in Phase 5.
- Next: Phase 2 (Claude reader) — needs Ethan's decisions on credential strategy (PLAN §2.2/2.3).

## Session 8b — Phase 2 (Claude) built
- Ethan said "go" without answering PLAN §2.2/2.3; proceeded with the plan's recommendation (route a: read ~/.claude/.credentials.json -> GET api.anthropic.com/api/oauth/usage). Revisit if he prefers otherwise.
- Live check: endpoint 200; credentials file has `claudeAiOauth{accessToken,refreshToken,expiresAt,...,subscriptionType}` (file also holds many mcpOAuth tokens — only claudeAiOauth is read). Response keys beyond five_hour/seven_day/limits[]/extra_usage/spend are obfuscated names, ignored.
- Added: electron/main/providers/{claudeParse,claude}.ts, electron/main/usageService.ts (5-min loop, per-provider in-flight dedupe, resolveAfterProbe), IPC usage:get/usage:refresh + usage:update event, preload/bridge, store `usage`, src/components/UsageList.tsx (throwaway list in the panel), tests/claudeParse.test.ts. 25 tests pass, typecheck clean.
- Real reader run from Node returned Session 31% / Weekly 22% used. NOT yet verified inside the running Electron app (npm run dev) or against `/usage` visually.
- Not done: 401 path untested live; user-agent version hard-coded 2.1.0 (installed CLI is 2.1.314); tab is still left/right so the list shows when hovering the left edge.

## Session 8c — Phases 3, 4, 4b done (autonomous run; Ethan: "do all phases till 7, proper, take your time")
- Decisions taken on Ethan's behalf (flag if he disagrees): credential route (a) everywhere (read the tools' own token files, never refresh them); Antigravity reuses an existing `acp_token.json` (env ANTIGRAVITY_ACP_TOKEN, ~/.gemini/antigravity-acp, or T3's managed profile) — IDE's protobuf login NOT read; OpenCode Console-key (SQLite) not supported (Electron's Node 20 has no node:sqlite); Cursor IDE token read by byte-scanning state.vscdb (hovr's own addition, 43-char sig verified on this machine).
- Providers live-verified on this machine: Claude (Pro; Session/Weekly), Codex (Free; Monthly 52%), Antigravity (via T3 token; Claude&GPT shared 5-hour + Weekly). Cursor: token extracted OK but expired (2026-09-02) -> "token expired" message; will work after opening Cursor. OpenCode: installed but no Go key -> "unsupported". Grok/Muse/Pi/Fx/Devin/Droid/Copilot/Gemini: not installed here (Grok parser tested on fixtures only).
- Code: providers/{types,util,registry,detectOnly}.ts, {claude,codex,cursor,grok,opencode,antigravity}.ts + *Parse.ts; usageService now = detect + read loop with ProviderStatus; IPC `usage:get/refresh` + `usage:update` carry UsageState {usage, providers}; Settings gained disabledProviders + usageRefreshMinutes; ProviderId 'acp' replaced by devin/droid/copilot/gemini.
- 46 tests pass. History readers (token/cost) deferred to Phase 7b.

## Session 8d — Phases 5, 6, 7 built; Phase 8 mostly done (verified by real screenshots on this machine)
- Phase 5: window is a fixed 760x660 transparent canvas centred on the top of the chosen display's workArea (shared/notch.ts, geometry.ts rewritten, 11 tests). Hover = main-process cursor poll streams window-relative coords (`window:cursor`); useNotchHover hit-tests the real pill/card rect (160 ms dwell to open; 280 ms grace to close; 900 ms in settings; 3.5 s grace after Alt+C/tray). Click-through while collapsed. Fixed an upstream bug: display fingerprint stored `bounds` instead of `workArea`, so taskbar offset > 8 px broke reboot re-matching.
- Phase 6: Notch.tsx (pill -> card -> settings sheet spring morph, inverse-corner flares), ring+percent chips (max 4 + "+N") or dots, UsageView/WindowRow (bar shows remaining, white tick = even-spend pace, Ahead/On/Under), "Needs attention" + "Also found" lists.
- Phase 7a: SettingsSheet (Providers / History / General / About). Providers: auto-detected groups, enable switch, Test button, expandable "what it reads / where it talks". General: collapsed style, refresh interval, display, fullscreen, cost estimates, motion, autostart. Settings shape reduced to hovr-only keys; old Edge-Drop settings.json is sanitised on load (shared/settingsSanitize.ts, 6 tests).
- Phase 7b: History from local logs (Claude ~/.claude/projects, Codex sessions + archived): parse.ts (Claude dedupe by message.id:requestId; Codex cumulative deltas, fork-replay suppression), pricing.ts (LiteLLM list, cached 24 h in userData/prices.json, optional), aggregate.ts. Real run: 30 days, 8.9K requests, 2.9B tokens (97% cache reads), est. API cost $870; first scan 5 s in Node (~12 s inside Electron), cached 0.1 s.
- Phase 8: README rewritten; FEATURES.md / features_and_architecture.md / onboarding / ChangelogView / releases IPC / sounds / old settings / pathValidation / detector.html / public gifs removed; updater disabled while BRAND.repoUrl is null; `npm test` script; production `npm run build` passes. 77 tests, typecheck clean.
- GOTCHA: this shell exports ELECTRON_RUN_AS_NODE=1, which makes `npm run dev` crash ("Cannot read properties of undefined (reading 'exports')"). Launch with `env -u ELECTRON_RUN_AS_NODE npm run dev`.
- Known gaps / honest caveats: Cursor token on this PC is expired (works once Cursor is opened); Grok/Muse/Pi/Fx/Devin/Droid/Copilot/Gemini not installed here (Grok parser fixture-tested only); OpenCode Console-key (SQLite) unsupported; Antigravity needs T3/Gemini-CLI token file; History "tokens" includes cache reads; "est. API cost" is list-price equivalent, not the subscription bill; no installer built/run; Windows only; multi-monitor and fullscreen-suppression logic is inherited and only unit-tested (geometry), not exercised live; Muse limits only appear on live turns so are not shown.
- Not committed: everything is still uncommitted in the working tree (Ethan has not asked for a commit).
