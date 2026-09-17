# Room browser verification

36 Node tests passed, including public/private listing, host-only visibility changes, occupancy updates, active/full room join restrictions, omission of empty rooms, list size bound and absence of credentials/private hand data.

Chromium, four independent browser contexts: public Boom room and private Zombie room; only public room shown; filter by mode/search; empty-name join blocked; named guest joins from card; occupancy reaches 2/6; host hides/reveals room; active game remains visible but cannot be joined. Zero page errors. Desktop 1440×1000 and mobile 390×844 screenshots inspected; no horizontal document overflow. Visibility control retains pending checkbox state until server reply.

Both-mode browser match flow had already passed in this revision, including private preview, reconnect, rescue/explosion, rematch and switch back to Zombie Cats. No new public deployment; all participants must reach the same server.
