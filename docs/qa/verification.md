# Verification — 2026-09-17

Executed on a Linux verification copy of the Windows project using Node 24.

- `npm test`: 21 passed, 0 failed.
- Node syntax checks: server.js, src/game/engine.js, public/app.js passed.
- Real Socket.IO integration: 6 clients join/ready/start; seventh rejected; targeted attack synchronized; out-of-turn/stale action rejected; public UUID cannot reconnect; private token can reconnect; old socket cannot act; leave/winner/rematch work.
- Headless Chromium, two isolated browser contexts: create/join/ready/start, 5-card hands, draw/advance, refresh/reconnect preserving hand, chat HTML escaped, winner dialog, restart lobby. No page errors.
- Browser views inspected at 1440×1000 and 390×844; no horizontal document overflow on mobile landing/table. Thai fonts embedded locally. Screenshots included here.

Windows runtime was not started remotely: the selected connector exposes file operations only. Restart the server with `npm.cmd start` in the Windows project after installing dependencies. No public hosting deployment was made. Room data is in memory and lost on server restart.
