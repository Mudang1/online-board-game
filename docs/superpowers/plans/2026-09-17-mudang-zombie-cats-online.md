# MuDang: Zombie Cats Online Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing Tic-Tac-Toe app with an original 2–6 player server-authoritative real-time multiplayer card game with private rooms, hidden hands, reconnect, zombie state, and polished browser UI.

**Architecture:** Keep Express + Socket.IO, but split rules into focused modules. The server owns all game state and sends public/private serialized views; the browser only renders state and sends intents. Use in-memory rooms and localStorage reconnect tokens for this version.

**Tech Stack:** Node.js ES modules, Express 5, Socket.IO 4, browser JavaScript, HTML/CSS/SVG, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-17-mudang-zombie-cats-online-design.md`

## Global Constraints
- Game must support 2–6 players.
- Private rooms use a 5-character room code.
- Server is authoritative for all legal actions and outcomes.
- Hidden hands must never be serialized to other players.
- Reconnect must preserve player identity and hand using a stable reconnect token.
- All card names, rules text, UI art, cat art, and assets must be original and not copied from Zombie Kittens.
- No database/accounts/public matchmaking in this version.

---

### Task 1: Build the game engine and card definitions

**Files:**
- Create: `src/game/cards.js`
- Create: `src/game/engine.js`
- Test: `test/game-engine.test.js`

**Interfaces:**
- Produces: `CARD_DEFINITIONS`, `buildDeck()`, `createRoom()`, `joinRoom()`, `setReady()`, `startGame()`, `playCard()`, `drawCard()`, `disconnectPlayer()`, `reconnectPlayer()`, `restartRoom()`.

- [ ] Write tests for 2–6 player joining, seventh-player rejection, ready/start validation, combat effects, infection/zombie transition, draw/turn advance, reconnect, elimination, and winner detection.
- [ ] Run `node --test` and confirm the new tests fail before implementation.
- [ ] Implement original card definitions and deterministic engine helpers.
- [ ] Run `node --test` and confirm all engine tests pass.

### Task 2: Add secure public/private state serializers

**Files:**
- Create: `src/game/views.js`
- Modify: `test/game-engine.test.js`

**Interfaces:**
- Consumes: room/player structures from `engine.js`.
- Produces: `serializePublicRoom(room)` and `serializePrivatePlayer(room, playerId)`.

- [ ] Add tests proving one player cannot see another player’s hand/card IDs.
- [ ] Implement public/private serialization with deck/discard counts and public player stats.
- [ ] Run `node --test` and verify privacy tests pass.

### Task 3: Replace Tic-Tac-Toe Socket.IO protocol

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes engine methods and serializers.
- Produces Socket.IO events: `create-room`, `join-room`, `reconnect-room`, `set-ready`, `start-game`, `play-card`, `draw-card`, `restart-room`; emits `room-state`, `action-error`, `game-event`.

- [ ] Replace Tic-Tac-Toe state/event handlers with card-game intent handlers.
- [ ] Ensure every mutating action validates through engine methods.
- [ ] Broadcast shared state while emitting only each socket’s private hand to that socket.
- [ ] Preserve rooms while disconnected players can reconnect and delete truly empty rooms.

### Task 4: Build the lobby and full-screen game table

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/style.css`

**Interfaces:**
- Consumes `room-state` and `action-error` payloads.
- Produces UI actions for create/join/ready/start/play/draw/restart and target selection.

- [ ] Replace Tic-Tac-Toe markup with lobby seats, ready controls, game table, opponent zones, deck/discard, local hand, target picker, log, winner overlay.
- [ ] Implement reconnect token persistence and auto-reconnect from localStorage.
- [ ] Render fanned hand cards and target-required interactions.
- [ ] Add responsive desktop/mobile tabletop styling and lightweight state-change animations.

### Task 5: Add original SVG game assets

**Files:**
- Create: `public/assets/logo-zombie-cat.svg`
- Create: `public/assets/cat-toxic.svg`
- Create: `public/assets/cat-ghost.svg`
- Create: `public/assets/cat-punk.svg`
- Create: `public/assets/card-back.svg`

**Interfaces:**
- Consumed by HTML/CSS card/player rendering.

- [ ] Create original neon zombie-cat SVG portraits and a card back using geometric vector shapes.
- [ ] Wire assets into lobby branding, player avatars, and hidden deck visuals.

### Task 6: Verify complete multiplayer flow

**Files:**
- Modify as needed based on failures.

**Interfaces:**
- End-to-end interaction across two or more browser clients.

- [ ] Run `node --test` and confirm all automated tests pass.
- [ ] Start server with `npm.cmd start` on Windows-compatible shell.
- [ ] Verify create/join/ready/start/play/draw/reconnect/restart flows using at least two clients.
- [ ] Fix any defects found and rerun the full verification.
