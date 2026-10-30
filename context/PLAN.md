# PLAN — hovr usage-limits notch

> **STATUS (Session 8): Phases 1-7 are built and verified live; Phase 8 mostly done.** See PROGRESS.md "Session 8" for what shipped and which decisions were taken on Ethan's behalf. The phase text below is the original plan and is kept for reference; where it disagrees with the code, the code and PROGRESS.md win. Resolved §2 decisions: all T3 providers (4b); credential route (a) read the tools' own token files and never refresh them; collapsed notch = per-provider ring + worst-remaining % (or dots, a setting); top edge = window centred at workArea top, hover arms on the visible pill (160 ms dwell), 5-min default refresh (1-30 min setting); Alt+C, tray and updater kept (updater disabled until a repo exists); Edge-Drop onboarding, clipboard code, widgets and changelog removed.


Status: **PROPOSED. Nothing here is agreed until Ethan says so.** Anything marked
`DECISION` is Ethan's call — do not pick it. Written 2026-10-30 after reading T3 Code.

Each phase is self-contained so context can be cleared between phases. Every phase has:
**Goal · Read first (T3 + hovr) · Build · Exit · Risks**. Start a phase by reading only
its "Read first" list.

All T3 paths are relative to `reference/t3code/` (MIT, pinned `32ecd71`, shallow clone,
gitignored, read-only — reimplement, never copy; see [reference/INDEX.md](../reference/INDEX.md)).

---

## 0. What we're building

A **notch at the top of the screen**. Collapsed: a small always-visible tab. Hover: it
expands to show **usage limits for every AI coding tool on the machine** (Claude Code,
Codex, Antigravity, …), detected automatically. A **Settings modal** connects providers
and shows deeper usage data, like T3's Usage page.

What Ethan liked in T3 (his words): the Usage page; **automatic provider detection**;
the settings flow to add/connect models.

Current hovr state (end of Session 7, see [PROGRESS.md](PROGRESS.md)): Electron + React +
TS + Vite, edge tab works (left/right only), panel body empty, widgets deleted, typecheck
clean. `psHost` (persistent PowerShell) kept. Clipboard-era settings still present.

---

## 1. How T3 actually works (verified by reading, not assumed)

T3 is a server + web/mobile clients on **Effect**. hovr is plain TS in Electron. We port
the *logic*, not the structure. T3 has **three different ways** to get limits:

### 1a. Claude Code — two routes

**Route A (T3's main path): spawn the CLI via the Claude Agent SDK.**
`apps/server/src/provider/ClaudeProvider.ts` `probeClaudeCapabilities` (L324–405):
opens a `query()` with no prompt (`persistSession:false`, `allowedTools:[]`,
`mcpServers:{}`, hooks disabled, 25 s timeout), awaits `initializationResult()` (gives
`account.email`, `subscriptionType`, `tokenSource`, `apiProvider`), then calls
`q.usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET({ skipBehaviors:true })`
→ `{ rate_limits_available, rate_limits }`. `skipBehaviors` matters: otherwise it scans
every local transcript and times out on multi-GB histories.
Converted by `apps/server/src/provider/claudeUsageLimits.ts`.

**Route B (direct HTTP — what hovr should consider): read the token file, call the
OAuth usage endpoint.** Verified in `apps/server/src/provider/claudeResetCredits.ts`
`readAccessToken` (L137–) and `readClaudeResetCredits` (L153–):
- Token: `<CLAUDE_CONFIG_DIR or ~/.claude>/.credentials.json` → `claudeAiOauth.accessToken`.
  **Not on macOS** (T3 returns undefined on darwin — Keychain). Windows is fine.
- `GET https://api.anthropic.com/api/oauth/usage`
  headers: `authorization: Bearer <token>`, `anthropic-beta: oauth-2025-04-20`,
  `user-agent: claude-cli/<version> (external, cli)` — `cliproxyApi.ts` L219 comments
  that the endpoint "can return 429 without a Claude Code user agent".
- Response shape (`apps/server/src/usage/cliproxyApi.ts` L55 `ClaudeUsage`):
  `five_hour {utilization 0-100, resets_at ISO|null}`, `seven_day {…}`,
  `limits[] { kind:"weekly_scoped", percent, resets_at, scope.model.display_name }`.
- Account id/org: `~/.claude.json` → `oauthAccount.organizationUuid`
  (`claudeResetCredits.ts` L175–181).

### 1b. Codex — two routes

**Route A (T3's main path): spawn `codex app-server` and speak JSON-RPC.**
`apps/server/src/provider/CodexProvider.ts` `withCodexAppServerClient` (L462–) +
`probeCodexAppServerProvider` (L511–): `initialize` → `account/read`
(`requiresOpenaiAuth` ⇒ not logged in) → `account/rateLimits/read`.
Env: sets `CODEX_HOME` explicitly (spawn passes literal `~`, Codex rejects it).
Converted by `apps/server/src/provider/codexUsageLimits.ts`:
`primary` = session (5 h, or **monthly for `free`/`go` plans**), `secondary` = weekly,
`individualLimit` = monthly credit cap; **skip snapshots whose `limitId` ≠ "codex"**
(model-specific limits must not overwrite the main allowance).

**Route B (direct HTTP):** `apps/server/src/usage/cliproxyApi.ts` L136 (`CODEX_BASE`), L210 (headers), L269+ (reads):
`GET https://chatgpt.com/backend-api/wham/usage`, headers `Authorization: Bearer`,
`OpenAI-Beta: codex-1`, `Originator: Codex Desktop`, `Chatgpt-Account-Id`. Response:
`plan_type`, `rate_limit.{primary_window,secondary_window}.{used_percent, reset_at
(epoch s), limit_window_seconds}`. Token lives in `<CODEX_HOME or ~/.codex>/auth.json`
(file name confirmed by `apps/server/src/provider/Drivers/CodexHomeLayout.ts` L33; its
**JSON field names were NOT verified** — read a real file before coding).
Also `…/wham/rate-limit-reset-credits` (banked "reset credits").

### 1c. Antigravity

`apps/server/src/provider/antigravityUsageLimits.ts` (315 lines). T3 runs its **own**
Antigravity ACP login and reads `<profileDir>/antigravity-acp/acp_token.json`
`{client_id, client_secret, refresh_token, project_id}`, refreshes via
`https://oauth2.googleapis.com/token`, then POSTs `…/v1internal:retrieveUserQuotaSummary`
(fallback `:fetchAvailableModels`) to **both** `https://daily-cloudcode-pa.googleapis.com`
and `https://cloudcode-pa.googleapis.com`, merging buckets keeping the highest used %.
Families: `gemini-*`→Gemini, `3p-*`→"Claude & GPT (shared)". Windows `5h`/`weekly`.
**Catch:** that token file is T3's managed profile, not a user's existing Antigravity
login. Whether hovr can reach an existing login is **unknown** — see Phase 4.

### 1d. The "hub" route (probably not for hovr)

`apps/server/src/usage/UsageLimitSources.ts` + `cliproxyApi.ts`: user points T3 at a
CLIProxyAPI server with a management key; T3 calls `…/v0/management/auth-files` and
`…/v0/management/api-call` so the hub makes the requests with its stored tokens. Settings
UI: `apps/web/src/components/settings/UsageProviderSettings.tsx`,
`AddUsageLimitSourceDialog.tsx`. Useful only if Ethan runs such a hub. **DECISION** (low
priority).

### 1e. Data model (port this nearly verbatim as plain TS)

`packages/contracts/src/providerUsageLimits.ts`:
```
UsageWindow  { id, kind: session|weekly|monthly|other, label, usedPercent 0-100,
               resetsAt?: ISO, windowDurationMins? }
UsageLimits  { checkedAt, windows[], credentialFingerprint?, resetCredits?,
               externalUsage?{label,url}, unavailable?{reason: unsupported|probeFailed, message?} }
```
Helpers `packages/provider-core/src/server/usageLimits.ts`: `clampPercent`, `sortWindows`
(session<weekly<monthly<other, then id), `makeUsageLimits`, `makeUnavailableUsageLimits`,
`applyUsageLimitsUpdate` (merge partial updates **by window id**, keep old `resetsAt`).
Key rules worth keeping:
- **Stable window ids** so sparse updates merge with full probes.
- **`unsupported` vs `probeFailed`** are different: clear bars for the former, **retain last
  good bars** for the latter.
- Percent from `remainingFraction` = `(1 − fraction) × 100`; Claude streaming utilization
  is **0–1** while `get_usage` is already **0–100**; Codex `individualLimit` is *remaining*.

### 1f. Presentation math (port)

`packages/shared/src/usageLimits.ts` L606–663: `remainingPercent`, `elapsedShare`,
`paceRemainingPercent`, `paceOf` (gap = used − elapsed·100; >5 ahead, <−5 under, else on),
`formatDuration` (`Xd Yh` / `Xh Ym` / `Xm`), `formatResetsIn`. UI: bars show **remaining**,
with a tick where even-spending would be (`apps/web/src/components/usage/UsageLimits.tsx`
`WindowBar`, `usePaceMark`, `paceMarkStyles`). Pooling/dedupe of the same account seen
from several sources: `collectLimitPools` L451+, keyed by `credentialFingerprint`
(L197) — Antigravity fingerprint = SHA-256 of Google account id.

### 1g. Detection & refresh

- Default provider-health refresh **5 min** (`packages/contracts/src/settings.ts` L942);
  `UsageLimitSources.ts` runs refresh on settings change + a forever loop + initial
  refresh, **serialized by a semaphore** so a slow stale read can't overwrite a newer one.
- "Installed" = CLI found on PATH (`resolveCommandPath`); version via `claude --version`
  (20 s timeout on Windows — native CLI startup is slow); auth state from the probe
  (`requiresOpenaiAuth`, Claude "Run `claude auth login`", Antigravity sign-in unchecked).
- Status model + wording: `apps/web/src/components/settings/providerStatus.ts`
  (`getProviderStatusKey`, `getProviderSummary`: Not found / Not authenticated /
  Needs attention / Authenticated · <label>).

### 1h. Security habits to keep

- Never surface response bodies — they can hold credentials. `cliproxyApi.ts`
  `describeManagementFailure` returns only failure kind / HTTP status / Node error code,
  with a special message for untrusted TLS cert codes.
- Antigravity requests use `redirect: "manual"` (don't forward the bearer on redirect).
- Timeouts everywhere: 10 s (HTTP), 15 s (hub), 25–30 s (CLI probes).

### 1i. Token/cost history (T3's "Usage page", separate from limits)

`apps/server/src/usage/UsageService.ts` (935 lines) scans local transcripts:
Claude `~/.claude/projects/**` via `provider/Drivers/claudeUsage.ts` (**dedupe by
`message.id:requestId`, keep first — each content block repeats the full usage, summing
overcounts ~2.4×**; skip model `<synthetic>`; advisor calls are separate records),
Codex via `provider/Drivers/codexUsage.ts` (skip `thread_spawn` subagent sessions) and
`usage/CodexUsageHistory.ts`. Prices from LiteLLM JSON, cached 24 h, history kept 92 days.
UI: `apps/web/src/components/usage/UsagePage.tsx` (1562 lines — metric/window toggles,
per-provider chart `UsageProviderChart.tsx`, per-model dialog `UsageModelDialog.tsx`,
price overrides `UsagePriceOverrides.tsx`, share bar `UsageShareBar.tsx`).
**Not read in depth** — read at Phase 7 start.

---

### 1j. Every other provider in T3 (added Session 7c; read in `reference/t3code/packages/provider-*/src/server/`)
T3's `apps/server/src/provider/builtInDrivers.ts` lists 10 drivers: Codex, Claude, **Cursor, Grok, Fx, OpenCode,
Antigravity, Pi, Muse, AcpRegistry**. `BUILT_IN_USAGE_DRIVERS` (same file, order matters: first duplicate wins)
= Claude, Codex, Grok, Pi, OpenCode, Muse, Antigravity, Cursor. Nothing here has been run; all from code.

| Provider | Live limits? | Source (verified in code) | Windows produced |
|---|---|---|---|
| Cursor | yes | `provider-cursor/src/server/usageLimits.ts`: `POST {api2.cursor.sh}/aiserver.v1.DashboardService/GetCurrentPeriodUsage`, bearer token, headers `connect-protocol-version: 1`, `x-cursor-client-type: cli`, body `{}`. Token: env `CURSOR_AUTH_TOKEN`, else `%APPDATA%\Cursor\auth.json` → `accessToken` (win32; mac uses Keychain, linux `~/.config/cursor`). Skip if `CURSOR_API_KEY` set. | monthly: `totalPercentUsed` "Overall", `autoPercentUsed` "Cursor Models", `apiPercentUsed` (labels in `packages/shared/src/usageLimits.ts` L116 `CURSOR_USAGE_WINDOWS`); reset = `billingCycleEnd` (ms epoch). 10 s timeout. Overall is *combined*, not a third quota. |
| Cursor (dashboard events) | history | `accountUsage.ts` L87: `https://cursor.com/api/dashboard/get-filtered-usage-events`; `CursorUsageAccounts.ts` caches per account (TTL, atomic write) | token/cost history, multi-account |
| Grok (xAI) | yes | `provider-grok/src/server/usageLimits.ts` L181: `GET https://cli-chat-proxy.grok.com/v1/billing?format=credits`, bearer. Token: `$GROK_HOME` or `~/.grok/auth.json`, key `"https://auth.x.ai::b1a00492-…"` or `"https://accounts.x.ai/sign-in"` → `{key, auth_mode, email}`. Bail if `XAI_API_KEY` or any GROK_OIDC/OAUTH2/CONFIG env, or config.toml has `[auth]/[grok_com_config]/[endpoints]`; ignore `auth_mode=api_key`. | one window id `subscription`; kind from `config.currentPeriod.type` (`USAGE_PERIOD_TYPE_WEEKLY/MONTHLY`), percent `config.creditUsagePercent` (missing ⇒ 0 if period valid), reset `currentPeriod.end` |
| Grok history | history | `usage.ts` L208: scans `~/.grok/sessions/**/updates.jsonl` only | tokens |
| OpenCode (Go plan) | yes, paid Go only | `provider-opencode/src/server/usageLimits.ts` L121: `GET https://opencode.ai/zen/go/v1/usage`, bearer. Key: `$XDG_DATA_HOME/opencode/auth.json` → `["opencode-go"].key`, or env `OPENCODE_API_KEY`, or OpenCode-2 console key in SQLite `opencode.db` (needs a SQLite reader; only if `metadata.server` is `https://opencode.ai/console`). 403 ⇒ unsupported. Skip if user runs an external server URL. | `go_rolling` session 5 h, `go_weekly`, `go_monthly`; each `{percent, resetsAt}`; `credentialFingerprint` = SHA-256 of `opencode-go + NUL + key` (dedupes same account across machines) |
| OpenCode history | history | `usage.ts`: reads `opencode*.db` (SQLite) + legacy JSON | tokens/cost |
| Muse (Meta) | yes, but *passive* | `provider-muse/src/server/protocol.ts` L170 `MuseSubscriptionUsage {observedAtMs, tier, window{usedPercent (may exceed 100), windowDurationMins, resetsAtMs}, weekly{usedPercent, resetsAtMs}}` comes back on each turn response, not from a poll; `usageLimits.ts` has 429 quota detection + reset parsing (`resets at <ISO>`). Home: `MuseUsageHome.ts`. | session window + weekly. **Open:** is there any pollable source, or only live turns? hovr is not the one running turns, so may need `~/.muse` session logs (`sessions/**/session.jsonl`) — unverified. |
| Pi | history only | `provider-pi/src/server/usage.ts`: parses `{type:"message", message.usage{input,output,cacheRead,cacheWrite,reasoning,cost.total}}` from Pi session JSONL | no limits found |
| Fx | unknown | `provider-fx/` not read | — |
| ACP registry | no | `provider-acp-registry/src/server/*`: generic ACP agents; has `claudeAcp.ts copilotAcp.ts devinAcp.ts droidAcp.ts`; tests mention gemini/kimi. No usage reader found in the grep. | no limits; **detect-only** entries |
| Antigravity | yes | §1c | — |

Common T3 pattern for all of these (port as-is): `makeUsageLimits` / `makeUnavailableUsageLimits(reason: unsupported|probeFailed)`,
`clampPercent`, 10 s timeout, `orElseSucceed(probeFailed)`, refuse to read credentials when env vars suggest a custom account/endpoint,
never pick an arbitrary account out of a multi-account auth file.

---

## 2. Open decisions (Ethan's call — ask, don't assume)

1. **Providers for v1** — **Ethan decided: everything T3 supports** (see §1j and Phase 4b). Build order still Claude → Codex → rest; each is one reader file behind the registry.
2. **Credential strategy** (the big one):
   - (a) read the CLIs' own token files directly (T3 does this for Claude Route B);
   - (b) spawn the CLIs and ask them (T3's main path; heavier, no token handling);
   - (c) user pastes/connects per provider in Settings.
   Trade-offs: (a) simplest + fast but undocumented endpoints; token may be expired
   (CLI refreshes it, hovr must not rotate refresh tokens it doesn't own); (b) robust to
   token changes but slow (Claude cold start >20 s on Windows) and the Claude usage call
   is marked `EXPERIMENTAL … DO_NOT_RELY_ON`.
3. **ToS / stability risk.** Route B uses an undocumented Anthropic endpoint with a
   Claude-Code-styled user agent. Accepting that is Ethan's decision.
4. **Collapsed notch contents** — worst-case remaining %, per-provider dots, or logo only?
5. **Top edge behaviour** — center-top notch vs full-width; multi-monitor; interaction
   with Windows taskbar-at-top and fullscreen suppression (existing `fullscreen.ts`).
6. **Polling cadence** — T3 uses 5 min. Poll while collapsed (notch visible all day)?
   Faster while expanded?
7. **Credential storage** for anything user-entered — Electron `safeStorage` (DPAPI) is
   the natural fit (Edge-Drop already used it).
8. Keep `Alt+C` global shortcut? Keep tray, autoupdater, onboarding window?
9. Squash Edge-Drop git history or keep (still open from PROJECT.md).

---

## Phase 1 — Domain model + pure logic (no I/O)

**Goal:** the usage types and math, fully unit-testable, no Electron.
**Read first:** §1e, §1f above; `packages/contracts/src/providerUsageLimits.ts`;
`packages/provider-core/src/server/usageLimits.ts`; `packages/shared/src/usageLimits.ts`
L594–663. hovr: `shared/types.ts`, `shared/ipc.ts`, `shared/bridge.ts`.
**Build:**
- `shared/usage.ts`: `UsageWindow`, `UsageLimits`, `ProviderId`, `ProviderStatus`
  (installed / authState / enabled / lastError), plain TS unions.
- `shared/usageMath.ts`: clamp, sort, merge-by-id, remaining %, elapsedShare, pace,
  formatDuration/formatResetsIn. Include T3's edge cases (null resetsAt, `windowDurationMins`
  absent ⇒ no pace).
- Add a test runner only if Ethan approves (none is configured today — check
  `package.json`). **DECISION.**
**Exit:** typecheck clean; pure functions covered by a handful of table tests or, if no
runner, a throwaway script run once.
**Risks:** don't copy T3 source; port behaviour.

## Phase 2 — Claude reader (vertical slice)

**Goal:** real Claude numbers on screen end to end, ugly is fine.
**Read first:** §1a; `claudeResetCredits.ts` L100–185; `claudeUsageLimits.ts` (all 225
lines — `claudeUsageResponseToLimits`, `readModelScoped`, `readSpendPercent`);
`usage/cliproxyApi.ts` L42–75 (`CodexUsage`, `ClaudeUsage`). hovr: `electron/main/ipc.ts` (`handle()` pattern),
`electron/preload/index.ts`, `src/store/appStore.ts`, `src/components/Panel.tsx`.
**Prereq:** Decision 2 (credential strategy). Before coding, **inspect a real
`~/.claude/.credentials.json` on Ethan's machine (fields only, never log the token)** and
hit the endpoint once by hand to see the live JSON.
**Build:** `electron/main/providers/claude.ts` (detect → read → map to `UsageLimits`),
IPC `usage:get` + event `usage:update`, store slice, throwaway list in the panel.
Handle: missing file ⇒ `unsupported` + message; 401 ⇒ `probeFailed` + "token expired,
open Claude Code once"; 429; timeout 10 s; retain last good.
**Exit:** hover the tab, see Claude Session/Weekly % matching `claude` `/usage`.
**Risks:** expired access token; endpoint shape drift (decode defensively, ignore
unknown); log redaction.

## Phase 3 — Codex reader

**Read first:** §1b; `codexUsageLimits.ts` (203 lines, all); `CodexProvider.ts` L455–600;
`cliproxyApi.ts` L136–330; `CodexHomeLayout.ts` L25–60. hovr: Phase 2 provider module.
**Prereq:** Decision 2; inspect real `~/.codex/auth.json` field names first.
**Build:** `providers/codex.ts`. Plan-aware windows (free/go ⇒ monthly), `limitId`
filter, `individualLimit`, optional reset-credit count. If using Route A, spawn
`codex app-server` through `child_process` (stdin/stdout JSON-RPC) with `CODEX_HOME`
expanded.
**Exit:** Codex session + weekly bars correct vs the Codex UI.
**Risks:** Route A needs `codex` on PATH and a version supporting
`account/rateLimits/read`; Route B token field names unverified.

## Phase 4 — Antigravity (and others) + detection registry

**Read first:** §1c, §1g; `antigravityUsageLimits.ts` (315), `Drivers/antigravityUsageReader.ts`
(486, skim), `AntigravityAuth.ts`/`AntigravityInstallation.ts` (skim);
`apps/web/src/components/settings/providerStatus.ts`.
**Note:** the other providers live in Phase 4b; this phase builds the registry they plug into.
**Prereq:** find where a *user-installed* Antigravity stores its login. T3 only knows its
own managed profile, so this needs research (may be a dead end ⇒ Antigravity deferred or
"connect via Settings" only). **DECISION** after findings.
**Build:** `providers/registry.ts`: list of drivers, each `{ detect(), authState(),
readLimits() }`; refresh loop (serialized by a mutex, per §1g), on-change publish only
when different; per-provider enable toggle; status object feeding Settings.
Detection = CLI on PATH (`where`) and/or config dir exists + auth state. Reuse
`electron/main/powershell.ts` only if needed; prefer `child_process.execFile`.
**Exit:** launching hovr with Claude+Codex installed lists both with correct status and
no manual setup; uninstalling/logging out flips status within one refresh.

## Phase 4b — Remaining providers (Cursor, Grok, OpenCode Go, Muse, Pi, Fx, ACP-registry, history readers)

**Decision made by Ethan (Session 7c):** include everything T3 has. One reader file per provider under
`electron/main/providers/`, all implementing the Phase 4 registry interface. Do them in this order (easiest first):
1. **Cursor** — one POST, one JSON file. Read `cursor/usageLimits.ts` whole (154) + `shared/usageLimits.ts` L116-141.
2. **Grok** — one GET; port the env/config bail-outs from `grok/usageLimits.ts` L88-194 exactly.
3. **OpenCode Go** — GET + auth.json; SQLite console-key path is optional (needs `better-sqlite3` or `node:sqlite`; **DECISION** on adding a native dep).
4. **Muse** — research first (what pollable source exists?); may ship detect-only.
5. **Pi, Fx, ACP-registry agents (Copilot, Devin, Droid, Gemini, Kimi…)** — detect-only (installed/auth state) until a limit source is found.
6. **History readers** (Grok `updates.jsonl`, OpenCode `opencode*.db`, Pi/Muse session JSONL, Cursor dashboard events) feed Phase 7b only.
**Per-provider exit:** fixture-based unit test for response→windows (copy T3's `*.test.ts` shapes), plus one manual run
against the real account with token redaction in logs. A provider without a verified source shows "Detected · limits unavailable", never a fake number.
**Risks:** all endpoints undocumented (Decision 3 applies to each); Windows paths above are from T3 code, not from files on this machine; Fx unread.

---

## Phase 5 — Top-edge notch (window + hover)

**Read first (hovr — this is the invasive phase):** `electron/main/window.ts` (616 lines;
`PANEL_WIDTH` L35, `createWindow` L284, `startCursorPoll` L134, `setInteractive`,
`repositionWindow` L510), `electron/main/geometry.ts` (`computeStickBounds`,
`StickPosition = 'left'|'right'`), `src/hooks/useEdgeHover.ts` (467), `src/components/Panel.tsx`
(`isRight` ×12), `electron/main/tray.ts`, `src/components/Settings.tsx` (stick position),
`shared/types.ts` `Settings`. Use the codebase-memory MCP (`index_repository`) now — the
repo is big enough.
**Build:** add `'top'` to the edge model (or replace left/right — **DECISION**); compute
bounds as a horizontally-centred strip at `workArea.y`; flip hover axis (cursor `y` near
top, `x` within notch span); panel animates down instead of sideways; hot-zone and
fullscreen suppression keep working; multi-monitor tiers (saved workArea fuzzy match) are
reused untouched.
**Exit:** notch at top, hover expands/retracts smoothly, click-through when collapsed,
survives display change + fullscreen game.
**Risks:** DPI/scale, taskbar-at-top, window width vs content, spring tuning (Edge-Drop's
`useAdaptiveSpring` is the starting point).

## Phase 6 — Notch UI

**Read first:** `apps/web/src/components/usage/UsageLimits.tsx` (`LimitWindows`, `WindowBar`,
pace tick), `UsageLimitsPooled.tsx` (grouping, account chips), `usage/usageProviders.ts`
(provider colours: Claude `#d97757`, Antigravity `#8c7bd1`, Cursor `#8b8b8b`, OpenCode
`#5b9bbd`, Pi `#4d9f8a`, Muse `#0866ff`, Codex = foreground). hovr: `Panel.tsx`,
`Header.tsx`, `styles/panel.css`, `styles/tokens.css`.
**Build:** collapsed notch per Decision 4; expanded panel = provider rows with window
bars (remaining %, pace tick, "resets in 2h 14m"), unavailable/warning states with
T3's wording, "last checked" + manual refresh. Colours per provider.
**Exit:** matches Ethan's mock; no layout jump on data change; reduce-motion respected.

## Phase 7 — Settings modal: connect providers + deeper data

**Read first:** `apps/web/src/components/settings/AddProviderInstanceDialog.tsx` (749) and
`.logic.ts` (3-step wizard: Provider → Identity → Config; id derivation with `_2` suffix
dedupe), `ProviderInstanceCard.tsx` (1349; status dot, auth email, env vars, diagnostics),
`ConnectionsSettings.tsx` (1541; skim structure only), `ProviderAccentColorPicker.tsx`,
`UsageProviderSettings.tsx`. For data views: `usage/UsagePage.tsx`, `UsageProviderChart.tsx`,
`usageBreakdown.ts`, `UsageService.ts`, `Drivers/claudeUsage.ts`, `Drivers/codexUsage.ts`.
hovr: `src/components/Settings.tsx` (930 lines, 3 stationary tabs), `styles/settings.css`.
**Build (split in two):**
- 7a *Providers tab*: list with status dot/headline/detail (port `providerStatus.ts`
  wording), enable toggle, manual connect (path override / paste token per Decision 2c),
  accent colour, refresh interval, "Test connection". Strip clipboard-era settings.
- 7b *Usage tab* (optional, later): token/cost history from local transcripts —
  daily chart, per-model breakdown. Must apply the **`message.id:requestId` dedupe**.
  Needs a price table (LiteLLM, 24 h cache) — network dependency, **DECISION**.
**Exit:** a fresh machine with a CLI installed but not detected can be connected from the
modal; removal wipes stored secrets.

## Phase 8 — Hardening & cleanup

Secrets via `safeStorage`; token/body redaction audit; error taxonomy end to end;
poll back-off on repeated failure; sleep/resume refresh (`powerMonitor`); regenerate
Edge-Drop-branded raster icons (list in PROGRESS Session 3); drop dead clipboard
`Settings` keys + `shared/types.ts` leftovers; README rewrite (still Edge-Drop's);
decide on onboarding/updater (`updater.ts` wants `dev-app-update.yml`); update `NOTICE`.

---

## 3. Ordering rationale

1→2 first: one real provider proves the pipeline (main → IPC → store → render) before
adding more, same logic as the old roadmap. Phase 5 (window) is independent of data and
could run in parallel with 3–4, but it's the riskiest change to inherited code, so it
goes after there is something worth displaying. Phase 7b is optional.

## 4. Things I got wrong earlier (corrected)

I said the credentials live in "`~/.claude/.credentials.json` and `~/.codex/auth.json`"
before reading T3. T3 **confirms the Claude path** (non-macOS) and **the Codex file
name**, but T3's *default* route spawns the CLIs and never touches Codex's file, and the
Codex field layout is unverified.

## 5. Per-phase "start of context" checklist

1. Read this file's section for the phase + §1 subsections it cites.
2. Read `context/PROGRESS.md` tail and `DECISIONS.md` tail (decisions made since).
3. `detect_changes` / `index_repository` (codebase-memory MCP) once code exists.
4. Re-open only the listed T3 files. Pinned SHA `32ecd71`.
5. At phase end: append to `PROGRESS.md`, record decisions in `DECISIONS.md`.
