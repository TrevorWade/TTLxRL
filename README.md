TikTok Gift → Key Mapper (TTL RL)
================================

Windows desktop app that maps TikTok Live events to keyboard inputs. Use it to automate in‑game actions (e.g., Rocket League) when gifts arrive or like milestones are reached.

Features
--------
- Gift → Key mappings with duration and cooldown
- Like Triggers: fire keys every N likes
- Live feed with aggregation for rapid gifts
- Profiles: save/load mappings and like triggers together
- Electron desktop build with auto‑update scaffolding

Quick Start (Development)
-------------------------
Prereqs: Node 18+ on Windows 10/11.

1) Clone and install
```
cd C:\apps\ttl_rl
npm install --prefix frontend ; npm install --prefix backend ; npm install --prefix frontend/electron
```

2) Start backend (WebSocket + keyboard sender)
```
cd backend ; npm run dev
```

3) Start frontend (Vite dev server)
```
cd ../frontend ; npm run dev
```

4) Optional: run Electron shell (loads built frontend)
```
cd electron ; npm run start
```

Production Build
----------------
Build frontend and Electron installer:
```
cd frontend/electron ; npm run build
```
Artifacts appear under `frontend/dist` and `frontend/dist-electron`.

Using the App
-------------
- Connect to TikTok Live in the header.
- Add Gift Mappings: pick a gift from the live feed and map to a key.
- Add Like Triggers: use Quick Setup pills or custom values; no scrolling needed.
- Profiles: open Profiles in the top bar to Save/Load/Delete. Profiles store both mappings and like triggers.

Tips
----
- Keep the game window focused; use the focus warning to diagnose missed keys.
- Duration 1.0s is typical; adjust for your game’s input timing.
- Cooldowns prevent spam when many gifts arrive quickly.

Troubleshooting
---------------
- If keys do not send: run backend as admin and ensure the game has focus.
- If the UI does not load: stop all servers and rerun steps 2–3.
- For unexpected errors, search the web for the exact error message to get the latest fixes.

License
-------
MIT


