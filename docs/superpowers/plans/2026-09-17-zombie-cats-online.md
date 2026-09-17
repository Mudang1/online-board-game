# MuDang Zombie Cats Online Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Tic-Tac-Toe prototype with an original 2–6 player real-time party card game playable from multiple browsers.

**Architecture:** Node/Express serves a vanilla web client. Socket.IO owns rooms and authoritative game state. Game rules live in a pure module so they can be tested independently; clients receive only their own hand plus public table state.

**Tech Stack:** Node.js, Express 5, Socket.IO 4, node:test, HTML/CSS/JavaScript.

**Spec:** Approved in chat on 2026-09-17.

## Global Constraints
- Original MuDang Zombie Cats branding/rules/assets; do not copy Zombie Kittens card text/art.
- 2–6 players.
- Private room code, ready/start flow, reconnect-friendly player token.
- Server-authoritative turns, deck, hands, targeting, health and winner.
- Mobile-responsive dark spooky-cute card-table UI.

---

### Task 1: Pure game engine
**Files:** Create `game/engine.js`, `test/engine.test.js`.
- [ ] Test deck creation, start, draw, attacks/heal/skip/steal/infection, turn advance and win detection.
- [ ] Run tests and verify red.
- [ ] Implement engine.
- [ ] Run tests and verify green.

### Task 2: Realtime room server
**Files:** Modify `server.js`, `package.json`.
- [ ] Wire create/join/ready/start/play/draw/chat/restart/disconnect events.
- [ ] Hide opponents' hands in serialized state.
- [ ] Add reconnect tokens and room cleanup.

### Task 3: Game client
**Files:** Replace `public/index.html`, `public/style.css`, `public/app.js`.
- [ ] Build lobby and 2–6 player room UI.
- [ ] Build table, deck/discard, hand, targets, ready/start/draw/end flow.
- [ ] Build chat, event log, health/status and winner overlay.
- [ ] Add responsive animations and original CSS cat/card models.

### Task 4: Verification
- [ ] Run `npm.cmd test`.
- [ ] Run server and verify HTTP root responds.
- [ ] Verify project file tree and startup instructions.
