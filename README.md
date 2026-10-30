# HOVR

A notch at the top of your screen that shows how much of your AI coding tools' usage limits you have left. Hover it and it opens into a card with every tool's session, weekly and monthly limits. Nothing to configure: hovr finds the tools on your PC.

| Tool | Live limits | Where hovr reads them |
|---|---|---|
| Claude Code | Session, weekly, per-model weekly, extra-usage spend | `~/.claude/.credentials.json` → `api.anthropic.com` |
| Codex | Session / weekly / monthly (by plan) | `~/.codex/auth.json` → `chatgpt.com` |
| Cursor | Overall, Cursor-model and other-model pools | Cursor CLI or IDE login → `api2.cursor.sh` |
| Antigravity | 5-hour and weekly quotas | an existing Google login from T3 Code or the Gemini CLI → Google Cloud Code |
| Grok | Credits for the billing period | `~/.grok/auth.json` → `cli-chat-proxy.grok.com` |
| OpenCode | Go plan session / weekly / monthly | OpenCode Go key → `opencode.ai` |
| Muse, Pi, Fx, Devin, Droid, Copilot, Gemini CLI | Detected only (no usage source is known) | PATH / config folder |

Settings → **History** also totals tokens and estimated API cost per day and per model from the local session logs of Claude Code and Codex.

## Using it

- Hover the pill at the top of the screen, press **Alt + C**, or click the tray icon.
- The gear opens Settings: switch providers on or off, test a connection, choose what the collapsed pill shows, set the refresh interval and the display it lives on.
- Bars show what is **left**. The white tick marks where an even spend would be right now: a fill short of the tick means you are burning faster than the window allows.

## What it touches

hovr reads sign-in files your tools already keep and asks each tool's own service for your usage. It never modifies those files, never refreshes or rotates your tokens (if one is expired it tells you to open the tool once), never writes them anywhere, and never sends them to anyone but the service they belong to. The one other network call is an optional daily download of a public price list for History's dollar estimates (switch it off in General).

The usage endpoints are the private ones each tool's own usage screen calls. They are undocumented and can change; when one does, that provider shows a message instead of numbers.

## Develop

```
npm install
npm run dev          # run the app
npm run typecheck
npm test
npm run build:win    # installer
```

Windows 11, Electron + React + TypeScript (electron-vite). Layout:

- `shared/`: types and pure logic shared by both processes (`usage.ts`, `usageMath.ts`, `notch.ts`, IPC contracts).
- `electron/main/providers/`: one driver per tool (`detect()` + `read()`), registered in `registry.ts`. Adding a tool is one file and one line.
- `electron/main/usageService.ts`: detect + refresh loop, publishes to the UI only on change.
- `electron/main/history/`: log scanners, pricing, aggregation.
- `electron/main/window.ts`, `geometry.ts`: the transparent top-centre window, cursor-poll hover, multi-display placement.
- `src/`: the notch, usage card and settings sheet.

## Credits

Forked from [Edge-Drop](https://github.com/Deepender25/Edge-Drop) (Apache-2.0); see `NOTICE`. The provider usage logic is a behavioural port of what [T3 Code](https://github.com/pingdotgg/t3code) (MIT) does, written fresh for hovr. Licensed Apache-2.0.
