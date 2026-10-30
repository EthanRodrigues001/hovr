# Decisions

Append-only log. Newest at the bottom. One entry per real decision — what was chosen,
what it was chosen over, and why.

---

## 2026-08-02 — Shelf trigger is a small visible tab/nub

**Chosen:** A small, always-visible handle at the screen edge. Hovering it expands the
shelf; leaving retracts it.

**Over:**
- Invisible screen-edge hot zone (classic auto-hide dock) — rejected, less discoverable
- Global hotkey toggle — rejected, not hover-activated

**Why:** Discoverability. The nub costs a few pixels of permanent screen real estate but
makes the shelf findable without the user knowing a hot zone exists.

**Open follow-ups:** which edge, nub size, whether the edge is configurable.

---

## 2026-08-02 — Stack deferred

**Chosen:** No stack. Explicitly deferred by Ethan — "don't do anything, we'll start
planning later."

**Why:** Ethan is directing the build order and wants to plan before any code exists.

**Implication:** No scaffolding, no dependency installs, no framework commitments until
he says so. Options surveyed but not chosen: Tauri (Rust + web UI), Electron + Node,
C# WPF/WinUI 3, Python + PySide6.

**Superseded** by the Edge-Drop fork below — the fork settled the stack as Electron.

---

## 2026-08-02 — Fork Edge-Drop rather than build from scratch

**Chosen:** Fork [Edge-Drop](https://github.com/Deepender25/Edge-Drop) v0.2.2 directly
into the project root and strip it down to hovr. Ethan's call — he'd used it and wanted
its UI feel.

**Why:** Edge-Drop already solves the hard, fiddly parts — edge-docked frameless
always-on-top window, reliable hover enter/leave on a transparent surface, DPI-adaptive
springs, multi-monitor geometry, fullscreen auto-hide. Rebuilding that to the same
polish would take far longer than deleting a clipboard manager out of it. The "gooey
snappy" feel Ethan wants *is* this codebase's motion layer.

**Consequences:**
- Stack is now Electron + React + TypeScript + Vite. Not independently chosen —
  inherited. Revisiting it means leaving the fork.
- Carrying ~3,300 lines of clipboard code that has to come out. See [TEARDOWN.md](TEARDOWN.md).
- Inherits Edge-Drop's Electron/React versions and their upgrade debt.

**Licensing:** Edge-Drop is Apache-2.0 — permissive, forking and relicensing-as-derivative
is fine. Obligations met: upstream `LICENSE` retained, `NOTICE` added at root recording
the fork point and stating files were modified (Apache-2.0 §4b/§4d).

**Repo hygiene:**
- Upstream history kept — `git diff upstream-baseline` shows everything we changed.
  Reversible; we can squash to a fresh root later if wanted.
- Fork point tagged `upstream-baseline` (5a7c907).
- Remote `origin` renamed to `upstream` with **push disabled**, so no accidental pushes
  to Deepender25's repo. hovr needs its own `origin` before anything can be pushed.
