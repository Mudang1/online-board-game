# Selectable modes verification — 2026-09-17

Node tests: 33 passed, 0 failed. Existing Zombie Cats regressions retained.
New rules cover safe initial hands for 2/6 players, hazard count, automatic rescue, elimination/winner, host-only mode switching and ready reset, private foresight/invalidation, draw-debt transfer/skip, action limits, theft validation, reconnect, timeout and switching back to the original mode.
Real Socket.IO test covers create-room mode, rejected invalid mode, host authority, readiness reset, no switching in a running match and no foresight leakage to other players.

Headless Chromium with two isolated contexts: select Boom at creation, guest sees mode but cannot change it, host changes mode and readiness resets, start Boom, private preview only visible to owner, passive rescue unclickable, reload preserves preview, pressure transfers two draws, automatic rescue consumes kit, hazard eliminates player, winner/rematch, switch back to Zombie with 5 HP. Zero page errors. Existing Zombie browser smoke also passes. Screenshots inspected at 1440×1000 and 390×844; no horizontal document overflow.

Checks run on local verification copy; selected Windows connector supports filesystem only. Restart the Windows Node process after updating. Public hosting status unchanged.
