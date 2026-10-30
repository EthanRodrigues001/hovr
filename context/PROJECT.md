# hovr

A hover-activated shelf for Windows 11. A small tab sits at the screen edge; hovering
it expands a shelf of widgets. First widget shows CPU screen time / uptime. More
widgets to follow.

## Settled

| Thing | Decision |
|---|---|
| Trigger | Small **visible tab/nub** at screen edge. Hover expands, mouse-leave retracts. **Pivot (2026-10-30): moving to the top edge as a notch showing AI usage limits.** |
| Content | AI tool usage limits (Claude, Codex, ...). Widgets from v0 removed. Details TBD by Ethan. |
| Target OS | Windows 11 |
| Stack | **Electron + React + TypeScript + Vite** — inherited from the fork |
| Base | Fork of [Edge-Drop](https://github.com/Deepender25/Edge-Drop) v0.2.2, Apache-2.0 |

## Open — do not decide unilaterally

- Which screen edge the nub docks to, and whether it's user-configurable
- Expand/retract animation and timing (inherited springs are a starting point, not final)
- Widget set beyond uptime
- Whether hovr keeps Edge-Drop's git history long-term or squashes to a fresh root
- Multi-monitor behavior
- Persistence / settings storage
- Autostart on login

## Working agreement

Ethan directs the work. Ask before choosing anything architectural. This file plus
[DECISIONS.md](DECISIONS.md) and [PROGRESS.md](PROGRESS.md) are the running memory of
the project — keep them current as things get decided.

## Tooling

**codebase-memory MCP** — index the repo and query it via `search_code` / `search_graph`
/ `get_architecture` instead of reading whole files into context. Keeps token usage down
as the codebase grows.

Not yet active: there is no code to index. Run `index_repository` once the first real
source files land, then `detect_changes` at session start to refresh incrementally.
Until then, the four markdown files in `context/` and `reference/` are the whole project
and are cheaper to read directly.
