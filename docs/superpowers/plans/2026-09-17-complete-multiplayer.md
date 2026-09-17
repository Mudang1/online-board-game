# Multiplayer completion implementation plan

Goal: Complete the user-approved existing Windows project, MuDang Zombie Cats Online.
Architecture: Express + Socket.IO, authoritative game engine, sanitized public views, separate private hands, one browser state contract `{room, me}`.
Spec: ../specs/2026-09-17-mudang-zombie-cats-online-design.md

- [x] Reproduce public token leak, offline start, missing zombie effects, missing turn expiry, hand overflow and invalid trick consumption with failing tests.
- [x] Add public UUIDs, private reconnect credentials, 60-second turns, max 10 cards, random swap and deck recycling, zombie attack bonus and decay.
- [x] Refactor server into createGameServer, bind sessions to sockets, reject stale turns, validate payloads, throttle requests, implement reconnect/leave and room expiry. Verify with actual Socket.IO clients.
- [x] Replace incompatible HTML/JS with landing, lobby and table screens, targeted card picker, safe log/chat, host controls and winner/rematch.
- [x] Extend existing original SVG assets with eight distinct local card illustrations.
- [x] Verify browser multiplayer, reconnect and mobile layout; back up existing Windows files and sync exact tested source.

Decisions: 5 starting HP, 5 cards; one action then draw; persistent guard; zombie attack +1 and end-turn HP loss 1; zombie tuna healing 1 HP; antidote cures below 3 infection. After turn 100, everyone loses 1 extra HP per own turn to guarantee progress. Full hand discards oldest before drawing. Empty rooms expire after 30 minutes; server restart loses in-memory rooms. Connector has no shell execution, so tests run on the identical local source copy.
