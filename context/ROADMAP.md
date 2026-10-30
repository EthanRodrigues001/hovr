# Roadmap — PROPOSED, not yet agreed

Ethan directs build order; this is a proposal. Nothing here is settled until he says so.
Once agreed, decisions move to [DECISIONS.md](DECISIONS.md).

---

## The one architectural call to make now

**There are two classes of widget, and they have opposite requirements.**

| | On-demand | Continuous |
|---|---|---|
| Examples | uptime, CPU %, RAM, battery | **screen time**, app usage totals |
| Where it lives | computed on read | accumulated in main process, always |
| Polls when shelf is closed? | **No** | **Yes — that's the point** |
| Needs persistence? | No | Yes, survives restart |
| Cost of getting it wrong | stale number for 1s | silently wrong totals forever |

This matters from day one because the naive design — "widgets poll their data" — is
right for one class and wrong for the other.

hovr is an always-running background app. A CPU widget that polls every second while the
shelf is retracted burns battery to display nothing, which is a particularly bad joke for
a CPU widget. `appStore.ts` already exposes `open: boolean`; on-demand widgets gate on it.

Screen time is the opposite: it *must* accumulate while the shelf is closed, because
closed is the normal state. The shelf just reads a total the main process has been
maintaining all along.

**Proposed contract:** the main process owns all metric state (it has `os`, `powerMonitor`,
and the store). On-demand metrics start/stop a poll on shelf open/close. Continuous
metrics run their own lifecycle independent of the shelf. Renderer only ever renders what
it's pushed — the pattern the codebase already uses for clipboard items.

---

## What to build first: uptime + CPU. Not screen time.

Counterintuitive, but: **uptime and CPU are worth building first precisely because they're
trivial.**

- `os.uptime()` — one line
- CPU % — diff two `os.cpus()` samples, ~20 lines, zero deps

Neither can be subtly wrong. That makes them the ideal payload for proving the whole
pipeline end to end: main computes → IPC carries → store applies → widget renders →
updates live while open → stops when closed.

Screen time is the opposite: idle thresholds, boundary attribution at `last_input`,
local-midnight rollover, suspend/lock handling. Every one of those fails *quietly*.
Build it first and when the number looks wrong, the bug could be in the metric, the IPC,
the store, or the render — four suspects. Build it second and there's only one.

---

## Phases

### 0. Baseline — before anything else
`npm install`, `npm run typecheck`, `npm run dev`. Confirm the fork runs on this machine:
nub visible, hover expands, shelf retracts.

Nothing has ever been run. The rebrand touched 19 files and is unverified. This is also
the last moment a problem can be blamed on the fork rather than on us.

**Exit:** Edge-Drop's shelf works, branded HOVR.

### 1. Widget contract
Read `Panel.tsx` (461) and `useEdgeHover.ts` (450) properly. Decide the widget interface
and where it plugs into the shelf body. Write it into DECISIONS.md.

**Exit:** a type for what a widget *is*, agreed before any are written.

### 2. Vertical slice — one ugly widget
Uptime only. Hardcoded into the panel, no styling, no settings, no persistence. Ships
looking bad on purpose.

Proves: main→IPC→store→render works, and that the shelf can host something that isn't a
clipboard item. Highest-value step in the plan — it retires the real risk, which is not
the metrics but whether this shelf is widget-shaped at all.

**Exit:** hover the nub, see real uptime, watch it tick.

### 3. Strip the clipboard
Now with something working to protect. Follow [TEARDOWN.md](TEARDOWN.md) in order,
leaves-first, verifying between steps. ~3,300 lines out.

Doing this *after* step 2 rather than before means the app is never in a state where it
does nothing.

**Exit:** shelf opens, shows uptime, no clipboard code remains.

### 4. Real widget system
Registry, multiple widgets, layout/sizing in the shelf, CPU widget alongside uptime.

**Exit:** two widgets coexisting, added declaratively.

### 5. Screen time
The hard one. Continuous accumulator in main: poll `getSystemIdleState`, attribute the
boundary at `last_input` (see [reference/INDEX.md](../reference/INDEX.md) — this is the
bug that silently inflates every session), persist, reset at *local* midnight, discard
suspend gaps.

**Exit:** a screen-time number that survives restart, sleep, and midnight.

### 6. Polish
Nub design, spring tuning, settings, autostart, icon regeneration from the HOVR mark.

---

## Deliberately not decided yet

- The widget set beyond uptime / CPU / screen time — Ethan's call
- Shelf layout: fixed slots, scrolling list, or grid
- Whether widgets are user-reorderable or fixed for v1
- Settings surface per widget

## Sequencing note

Phases 0–3 are load-bearing and ordered. 4–6 can reshuffle. The only hard rule is
**baseline before deleting** and **something working before stripping**.
