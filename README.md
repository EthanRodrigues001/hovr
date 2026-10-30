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

The **Analytics** view (chart icon on the card) has a Forecast of which limits will run out before they reset, Spend (tokens and estimated API cost per day and per model from the local session logs of Claude Code, Codex and Antigravity) and a Timeline of every limit window. hovr can also show a desktop alert when a limit is nearly used up or will run out early.

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

## Credits and licence

hovr is licensed under the [Apache License 2.0](LICENSE).

- **Edge-Drop** by Deepender25 and contributors (Apache-2.0): https://github.com/Deepender25/Edge-Drop. hovr started as a fork of Edge-Drop v0.2.2 (commit `5a7c907`, tagged `upstream-baseline`). It keeps the transparent edge-anchored window, the hover-expand interaction and the Electron/React structure, and replaces the clipboard-manager features with the usage-limits notch. Edge-Drop's files have been modified; `git diff upstream-baseline` shows every change.
- **T3 Code** by T3 Tools Inc. (MIT, Copyright (c) 2026 T3 Tools Inc.): https://github.com/pingdotgg/t3code. The provider usage logic follows what T3 Code does (which endpoint each tool exposes, the Antigravity conversation-database field layout and model-id table). hovr's code for it is written fresh, and the facts above come from T3 Code's MIT-licensed source.
- **Brand marks** (Claude, OpenAI/Codex, Cursor, Antigravity, Grok, OpenCode, Gemini, Copilot, Devin, Muse, Pi) come from [@lobehub/icons](https://github.com/lobehub/lobe-icons) (MIT) and belong to their owners.
- Dollar estimates use the public [LiteLLM](https://github.com/BerriAI/litellm) (MIT) price list, downloaded at runtime and not bundled.

Claude, Codex, Cursor, Antigravity, Grok, OpenCode and the other tools named here belong to their owners; hovr is not affiliated with or endorsed by them.
