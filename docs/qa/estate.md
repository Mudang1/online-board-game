# Estate verification — 2026-09-17

Implementation: isolated estate rules module, authoritative server events, public views, responsive 24-tile board, original MuDang SVG character, fourth mode in lobby and room browser.

Validation: 65 Node tests pass across all four modes, including actual Socket.IO clients. Estate tests cover 2/6 seats, dice bounds, forged dice/cash ignored, stale commands, purchase, district building, rent, start bonus, debt liquidation, bankruptcy, release on leave, timeout, reconnect, round cap/shared victory, invalid atomic actions and rematch.

Chromium: separate 1440 px and 390 px browser contexts create/public-browse/join/ready/start; open rules; roll; buy; build; advance turns; reload/resume; surrender; winner; rematch; switch to Crystal. No page errors or page-level horizontal overflow. Board intentionally scrolls on phones. Inspected full-page screenshots.

Browser purchases/building use deterministic server fixtures for property position/district ownership. Normal rules and rejected purchases are separately unit tested. Windows startup and hosting deployment have not been executed by this filesystem connector.
