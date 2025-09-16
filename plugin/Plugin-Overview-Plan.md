Plugin Overview Plan

Goal:
Detect the player’s game state in Rocket League (main menu, in-game, replay, goal replay, paused) and send real-time updates to the desktop app so that queued actions are executed only when appropriate.

1. Key Features

Game State Detection

inMenu → Main menu or pause menu.

inGame → Active gameplay.

inReplay → Replay (including goal replay).

gamePaused → Player paused mid-match.

Event Emission

Emit state changes to the app as JSON messages.

Include timestamp with each event.

Only send when the state changes to reduce unnecessary traffic.

Communication with App

Local WebSocket preferred for low-latency.

Alternative: local HTTP POST endpoint.

Event format example:

{
  "state": "inGame",
  "timestamp": 1692700000
}


Polling vs Event Hooks

Poll game state every 100–500ms.

Use Bakkesmod hooks if available (MatchStarted, MatchEnded, ReplayStarted, ReplayEnded, PauseChanged).

Reliability

Auto-reconnect to app if the connection drops.

Handle Rocket League restarts gracefully.

Optional

Include minor info like player’s current session time or score for future extensions.

2. Plugin Flow

Initialize plugin on Rocket League start.

Connect to app via WebSocket.

Poll game state or listen for events.

When state changes, send JSON event to app.

Keep sending periodic updates if needed or on state changes.

Disconnect cleanly when Rocket League closes.