# Crystal Guild verification — 2026-09-17

- Engine and actual Socket.IO client tests cover 2–6 players, authoritative payments, invalid actions, hidden reservations, round completion, shared victory, timeout and reconnect.
- Chromium with separate desktop (1440 px) and mobile (390 px) contexts: create Crystal public room, browse/join, ready/start, nine market cards, collect gems, reserve privately, buy, reload/resume, final round, rematch, switch Boom/Zombie. No browser page errors or document horizontal overflow.
- Endgame/browser purchases used deterministic server-side fixtures to exercise paths quickly. Unit tests also exercise normal starting wallets and purchase rejection.
- Existing Zombie/Boom tests retained. Windows process startup and external hosted deployment are not run by the filesystem connector.
- Original SVG guild characters and custom card data; no imported third-party game artwork.
