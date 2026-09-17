# MuDang: Zombie Cats Online — Design Spec

## Product Goal
Transform the existing Socket.IO tic-tac-toe project into an original browser-based multiplayer party card game for 2–6 players. The game uses private rooms, room codes, real-time synchronization, server-authoritative rules, reconnect support, hidden hands, turn logs, zombie state, and an original visual identity. It is inspired by social party-card pacing, but must not copy Zombie Kittens card names, artwork, text, or exact rules.

## Core Match Flow
1. A player creates a private room and receives a 5-character room code.
2. Up to 5 more players join with the code.
3. Players toggle Ready. The host may start when 2–6 players are connected and ready.
4. Server creates and shuffles the deck, gives each player a starting hand, sets HP, and selects the first turn.
5. On a turn, the active player may play cards from hand while their action budget allows, then must draw to end the turn.
6. Card families: Attack, Defense, Heal, Trick, Infection, and Utility.
7. Infection can push a living player into Zombie state. Zombie players remain in the match with altered rules and can still affect the table.
8. A player is eliminated when HP reaches 0 and no rule prevents elimination.
9. Last non-eliminated player wins. If only one player remains active after a state transition, the server ends the game immediately.

## Original Card System
The initial deck uses original cards and effects only. Example card concepts:
- Scratch Frenzy — Attack: deal 2 damage to a target.
- Trash-Can Shield — Defense: gain 2 guard until next turn.
- Tuna Patch — Heal: restore 2 HP up to max HP.
- Alley Swap — Trick: swap one random card with a target.
- Viral Bite — Infection: add 1 infection; reaching 3 infection transforms the player into Zombie state.
- Nine Lives — Utility: prevent one lethal hit, then discard.
- Midnight Yowl — Attack/Trick: deal 1 damage to all opponents and reveal the top deck family.
- Antidote Sardine — Heal: remove 1 infection or restore 1 HP.

Deck composition and numeric tuning remain isolated in a card-definition module so balancing can change without rewriting Socket.IO handlers.

## Player State
Each player has:
- stable reconnect token
- socket ID when connected
- display name
- host flag
- ready flag
- HP / max HP
- infection count
- zombie flag
- eliminated flag
- guard amount
- hand of private card IDs
- turn counters / transient flags

The reconnect token is stored in browser localStorage. A reconnect replaces the old socket binding without changing player identity or hand.

## Server Authority
The browser never decides whether an action is legal. The client only sends intents such as play-card, draw-card, ready, start-game, and choose-target. The server validates room, player, phase, turn ownership, card ownership, target legality, effect conditions, and victory state before mutating game state.

The server sends two views:
- Public room state: room code, phase, current player, deck/discard counts, public player stats, log, winner.
- Private player state: the requesting player’s hand plus any private prompts.

Other players never receive another player’s card identities.

## Room Lifecycle
Room phases:
- lobby
- playing
- finished

Rooms are held in memory for this version. Empty rooms are deleted. A disconnected player is marked offline and can reconnect with the saved token. During an active match, short disconnects do not remove the player immediately; the room remains recoverable while at least one client stays connected.

## Turn Rules
- Active player starts with one standard action budget.
- Most cards consume the action budget; selected utility cards may be marked free-action.
- The player may end the action phase by drawing from the deck.
- Drawing ends the turn unless the drawn card explicitly says otherwise.
- Server advances to the next non-eliminated player.
- Zombie state may modify attack/heal behavior through card effect code, but turn order is unchanged.

## Networking Events
Client → server:
- create-room
- join-room
- reconnect-room
- set-ready
- start-game
- play-card
- draw-card
- restart-room

Server → client:
- room-state
- action-error
- game-event

Acknowledgement callbacks are used for create/join/reconnect/start operations.

## UI / UX
The browser UI has two major screens.

### Lobby
- original MuDang: Zombie Cats Online branding
- player name field
- create room / join room controls
- room code display and copy button
- list of 2–6 seats with online/ready/host state
- Ready button and host Start button

### Game Table
- full-screen dark neon tabletop
- opponents around the upper table with avatar, HP, infection, zombie/offline status, hand count
- central deck and discard pile
- current turn indicator
- local player panel at bottom
- hand rendered as a curved/fanned row of cards
- target picker when a played card requires a target
- turn log panel
- lightweight CSS visual effects for damage/heal/infection/zombie transitions
- responsive layout for desktop and mobile

## Art Direction
All game visuals are original and produced from CSS/SVG assets stored in the project. Zombie-cat portraits use a cute grotesque neon style: oversized eyes, torn ear silhouettes, toxic green accents, magenta/purple shadows, and no resemblance to existing Zombie Kittens card art. Card illustrations are abstract SVG scene art generated from reusable shapes, not copied assets.

## File Architecture
- `server.js` — Express/Socket.IO bootstrap and connection lifecycle only.
- `src/game/cards.js` — original card definitions and deck builder.
- `src/game/engine.js` — room creation, validation, turn rules, effects, reconnect-safe state mutation.
- `src/game/views.js` — public/private serialization to prevent hand leaks.
- `public/index.html` — lobby and table markup.
- `public/app.js` — client socket wiring, local state, interaction rendering.
- `public/style.css` — responsive visual system, card/table effects.
- `public/assets/*.svg` — original logo, cat avatars, card backs/illustrations.
- `test/game-engine.test.js` — core server-rule tests using Node’s built-in test runner.

## Error Handling
Invalid actions never mutate state. Server sends a concise Thai `action-error` message for wrong turn, invalid card, missing target, full room, bad room code, or unavailable restart. Socket disconnects update connection state but do not expose or discard hidden hands.

## Testing / Acceptance Criteria
Automated tests must cover:
- room creation and unique player identity
- joining up to six players and rejecting a seventh
- game start validation
- starting hands remain private in serialized views
- illegal out-of-turn actions are rejected
- Attack / Defense / Heal / Infection effects
- zombie transition at infection threshold
- draw advances turn
- elimination and winner detection
- reconnect preserves identity and hand

Manual flow test:
1. Open two browser tabs.
2. Create a room in tab A and join in tab B.
3. Ready both players and start.
4. Verify hands differ and remain hidden from the other tab.
5. Play a targeted card, verify synchronized HP/log changes.
6. Draw and verify turn advances.
7. Refresh one tab and verify reconnect restores the same player/hand.
8. Finish a match and verify winner + restart flow.

## Scope Boundaries
This version intentionally does not include accounts, persistent database storage, public matchmaking, payments, ranked ladders, bots, voice chat, or authoritative persistence across a full server restart. The architecture keeps the game engine isolated so database persistence can be added later without rewriting card rules.




## Implemented contract — 2026-09-17 completion revision

This section supersedes earlier illustrative event names and example effects. Wire state is `state: {room, me}`. Public identity is `id`; `currentPlayerId` and `winnerId` reference it. Secret reconnect tokens appear only in create/join/reconnect acknowledgments, never state. Client events are create-room, join-room, reconnect-room, ready, start-game, play-card, draw, chat, leave-room, remove-offline and restart. Play/draw require exact turnNumber. Guard lasts until consumed; Midnight Yowl deals damage without revealing any deck card. Infection threshold 3 yields zombie attack +1 and end-turn HP loss 1; Tuna Patch heals 1 while zombified, 2 otherwise. Antidote cures below 3 infection. Turn time 60 seconds. Hand cap 10, oldest discard on overflow. After turn 100, end-turn HP loss +1. An empty room expires after 30 minutes and does not persist through server restart. Session storage isolates ordinary browser tabs. Offline host transfers to a connected player. Only the host may remove offline lobby seats or start a finished-game rematch. Original SVG vectors supply all art.
