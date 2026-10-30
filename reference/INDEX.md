# Reference

Third-party code pulled from GitHub, kept here to **read** while implementing hovr.

## Rules

1. **Read-only.** Nothing in `reference/` is ever edited, imported, or built. It is
   study material, not a dependency.
2. **Never shipped.** Once hovr is a git repo, `reference/` gets gitignored (except this
   file). Don't vendor code out of here into the project — reimplement, don't copy.
3. **Logged.** Every pull gets a row below: what, why, commit SHA, license. Pin the SHA —
   "I read it at some point on main" is not reproducible.
4. **License-aware.** Note the license before reading. Reading GPL code and then writing
   similar code is a real risk; prefer MIT/Apache-2.0 references for anything whose
   structure we'd echo closely.

## Layout

```
reference/
  INDEX.md          <- this file
  <repo-name>/      <- shallow clone, one dir per source repo
```

Pull with a shallow clone to keep it light:

```
git clone --depth 1 <url> reference/<repo-name>
```

## Pulled

Cloned 2026-08-02, shallow (`--depth 1`). `reference/` is gitignored except this file —
see [.gitignore](../.gitignore). That is deliberate and load-bearing: committing the
Tockler clone into this Apache-2.0 repo would be redistributing GPL-2.0 code under the
wrong licence.

| Repo | Why | Commit | Date | Size | License |
|---|---|---|---|---|---|
| [aw-watcher-afk](https://github.com/ActivityWatch/aw-watcher-afk) | The AFK algorithm. Small, readable, the reference implementation everyone copied. | `2ee285f` | 2026-07-22 | 0.2 MB | MPL-2.0 |
| [systeminformation](https://github.com/sebhildebrandt/systeminformation) | CPU metrics, if `os.cpus()` proves insufficient | `dd573fb` | 2026-07-23 | 5.1 MB | MIT |
| [tockler](https://github.com/MayGo/tockler) | Nearest architectural match — **quarantined**, see below | `96b6d49` | 2025-06-21 | 28.8 MB | **GPL-2.0** |
| [t3code](https://github.com/pingdotgg/t3code) | Usage page, automatic provider detection (Claude / Codex / Antigravity), provider-connect settings. Reference for the usage-limits notch. | `32ecd71` | 2026-10-30 | large | MIT |

**Tockler carries a `_READ_THIS_FIRST.md`** at its root explaining why it must not be
copied from. Its licence file is `LICENCE.txt` — British spelling, which is why a
`LICENSE*` glob misses it. Don't assume "no LICENSE file" means unlicensed.

---

# Screen time — research, 2026-08-02

## Headline: Electron already does this. No new dependency needed.

[`powerMonitor`](https://www.electronjs.org/docs/latest/api/power-monitor) is built in:

| API | Returns | Notes |
|---|---|---|
| `getSystemIdleTime()` | seconds since last input | All platforms. Wraps `GetLastInputInfo` on Windows. |
| `getSystemIdleState(thresholdSec)` | `active` / `idle` / `locked` / `unknown` | `locked` is the one that matters — a locked machine is not screen time. |
| `lock-screen` / `unlock-screen` events | — | Windows + macOS |
| `suspend` / `resume` events | — | All platforms. Needed so sleep isn't counted. |

We already depend on `koffi` (FFI) and have `electron/main/powershell.ts`, so a native
win32 path exists — but it isn't needed. `getSystemIdleState` covers it.

Known `getSystemIdleTime` bugs are all Linux/Wayland
([#27912](https://github.com/electron/electron/issues/27912),
[#34826](https://github.com/electron/electron/issues/34826)). Irrelevant — hovr is
Windows-only.

## Projects surveyed

| Project | Stack | License | Verdict |
|---|---|---|---|
| [Tockler](https://github.com/MayGo/tockler) | Electron + TS + React | **GPL-2.0** | Closest match — but see warning below |
| [ActivityWatch](https://github.com/ActivityWatch/activitywatch) | Python + JS, client/server | MPL-2.0 | Canonical AFK semantics. Far heavier than we need. |
| [aw-watcher-afk](https://github.com/ActivityWatch/aw-watcher-afk) | Python | MPL-2.0 | The actual idle-detection logic. Small, readable. |
| [systeminformation](https://github.com/sebhildebrandt/systeminformation) | Node | MIT | For CPU%, if `os.cpus()` proves insufficient. Dependency-free. |

### ⚠️ Tockler is GPL-2.0 — do not copy from it

It's the nearest thing to what we're building (Electron, TypeScript, tracks active window
+ idle time), which makes it the most tempting and the most dangerous. GPL-2.0 is strong
copyleft: derive from it and hovr must be GPL-2.0 too, which collides with the
Apache-2.0 fork base.

Reading it for *concepts* is fine. Copying code, or reimplementing while looking at it
closely enough to echo its structure, is not. Given `powerMonitor` hands us the whole
mechanism, there's no reason to open it at all.

ActivityWatch's MPL-2.0 is file-level copyleft — materially safer, and fine to read.

## AFK semantics worth stealing (concepts, not code)

Read directly from `reference/aw-watcher-afk/aw_watcher_afk/afk.py` (MPL-2.0).

**Correction to an earlier note in this file:** a first pass summarised this as "does not
retroactively attribute the idle period." That was wrong and worth stating plainly,
because the real behaviour is the opposite and it's the whole point of the design.

### The one thing that matters: timestamp at `last_input`, not at `now`

```python
now = datetime.now(timezone.utc)
seconds_since_input = seconds_since_last_input()
last_input = now - timedelta(seconds=seconds_since_input)
```

Every event is stamped at **`last_input`** — the moment input actually stopped — not at
the moment the poll loop noticed. On the transition into AFK it emits the AFK event
backdated to `last_input`, carrying `duration=seconds_since_input`.

Why it matters: the naive version flips state at *detection* time, which means the entire
timeout window (3 minutes, by default) gets counted as active time every single time you
walk away. Ten breaks a day is half an hour of phantom screen time. The bug is invisible
in testing because each individual error is small.

### The rest

- **Default timeout is 3 minutes.** Shorter and you log noise every time someone reads
  something on screen without touching input.
- **`assert timeout >= poll_time`** — polling slower than the timeout means missed
  transitions entirely.
- Transitions emit **two events, 1 ms apart** (`td1ms`): one closing the old state, one
  opening the new. That's an artifact of ActivityWatch's heartbeat-merging storage model,
  not something hovr needs — we're accumulating a counter, not writing an event log.
- Windows idle input comes from a platform shim (`.windows.seconds_since_last_input`)
  wrapping `GetLastInputInfo`. **Electron's `powerMonitor.getSystemIdleTime()` is exactly
  this**, already wrapped — we don't need the shim.

### What hovr actually needs

Much less than ActivityWatch. It stores a queryable event log across buckets; hovr needs
a single daily counter. Roughly:

1. Poll `getSystemIdleState(threshold)` on an interval.
2. Accumulate elapsed time when state is `active`. Skip `idle`, `locked`, `unknown`.
3. Attribute the boundary at `last_input`, per above — not at poll time.
4. Reset at **local** midnight, not UTC.
5. Listen for `suspend`/`resume` and `lock-screen`/`unlock-screen` so sleep isn't counted
   as active. Polling alone can't see a suspend — the process is frozen and simply
   resumes with a large wall-clock gap that must be discarded rather than accumulated.

## Terminology — these are three different things

Worth pinning down before building, because "CPU screen time / uptime" conflates them:

| Metric | How | Effort |
|---|---|---|
| **Uptime** — since last boot | `os.uptime()` | One line. Says nothing about whether you were there. |
| **Screen time** — active-at-machine today | Poll `getSystemIdleState`, accumulate active seconds, persist, reset at local midnight | ~100 lines. The only one that needs storage. |
| **CPU usage** — % utilization | Diff two `os.cpus()` samples over an interval | ~20 lines, zero deps |

Screen time is the only one that needs persistence, a midnight rollover, and handling for
suspend/resume and lock/unlock. The other two are instantaneous reads.
