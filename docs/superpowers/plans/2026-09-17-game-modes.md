# Selectable game modes

User-approved extension: keep Zombie Cats and add a selectable draw-risk party card mode inspired by the genre, called MuDang: Boom Cats. Reuse private-room sessions, authoritative rules and reconnect. Original local SVG art and adapted rules.

- Host chooses zombie or boom at creation or in lobby. Mode is public, not controlled by individual joining clients. Mode change resets everyone’s ready flags. No changes during a match. Rematch keeps the last mode and host can change it in lobby.
- Boom: deal 4 safe cards + 1 Fuse Kit each, then shuffle n-1 Live Wire hazards and 2 additional Fuse Kits into remaining safe cards. Three action cards per turn, 60 seconds. Normal draw debt 1. Rooftop Hop removes one owed draw. Double Dare passes remaining debt +1, capped at 6, to next active player. Night Vision shows top 3 only to owner until deck changes or turn ends. Alley Mix shuffles; Sticky Paws steals randomly. Hazards consume a kit automatically and return at a server-random position; no kit means elimination. No recycling; empty deck causes elimination to guarantee eventual end. No zombie HP/infection effects in this mode.
- Private preview survives reconnect when deck unchanged. Turn timeout resolves all debt; eliminated players’ remaining debt is cleared. Public state contains mode/debt; never hand/peek/credentials.
- Implement isolated boom.js, retain old engine behavior through dispatch, update card views and Socket.IO create/set-mode events.
- UI: two selectable cards before create and in lobby, host-only switching, rules/labels/stats/theme conditional, passive kits disabled, private preview panel. Seven original SVG card illustrations and a new orange mascot variation.
- Verify pure-rule tests, real Socket.IO clients and browser flow for host switch, ready reset, both-mode matches, private preview, reconnect and mobile layout. Back up changed remote files, sync and read back before reporting completion.


## Added room browser per user follow-up

Public/private visibility at creation and host-only lobby toggle. Existing API callers default private; new browser creations visibly opt into public listing by checked checkbox. Public summaries whitelist room code, mode, host name, counts and phase only; omit private/all-offline rooms and cap at 100, open lobbies first. Poll every 5 seconds on visible landing screen; manual refresh, search/mode/available filters and direct join. Full/playing/finished cards disable joining; server remains final authority in races. List operates within this server, not across separately running localhost instances.
