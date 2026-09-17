# Estate viewport and artwork verification

Adds 24 original vector place illustrations and 6 shaded cat token illustrations. These are lightweight SVG illustrations with depth/shadows, not interactive 3D meshes. Tokens match player colors and labels. Assets are served locally without external dependencies.

The estate game uses the available dynamic viewport height. The entire board and primary controls remain onscreen. Secondary land holdings and history open in a dialog. Details may scroll inside their panel when space is limited. Fullscreen is optional. Other game modes keep their existing layouts.

Chromium verification: 1918x870, 1366x620, 1280x600, 1024x768, 390x844. Asserted document height does not exceed viewport; all 24 tiles and roll/buy/end/ledger controls are within viewport; place/pawn images load. Inspected desktop and mobile screenshots. Two browser contexts also exercised room listing/join, roll, buy, build, reconnect, winner, rematch and mode switch. Ledger opens/closes. JavaScript syntax checks pass.

Windows files updated through filesystem connector. Hosted Render deployment is not updated by these file edits alone.
