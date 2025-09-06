# GameStatePlugin for Rocket League

A Bakkesmod plugin that detects the player's game state in Rocket League and sends real-time updates to a desktop application.

## Features

- **Real-time Game State Detection**: Detects four game states:
  - `inMenu` - Main menu or pause menu
  - `inGame` - Active gameplay
  - `inReplay` - Replay mode (including goal replays)
  - `gamePaused` - Game is paused mid-match

- **Efficient Communication**: Uses WebSocket to send JSON updates to desktop apps
- **Multiple Detection Methods**: Supports both Bakkesmod hooks and polling
- **Auto-reconnect**: Automatically reconnects to desktop app if connection drops
- **Low Traffic**: Only sends updates when game state actually changes
- **Robust**: Handles Rocket League restarts gracefully

## Requirements

- Rocket League
- Bakkesmod installed and running
- C++17 compatible compiler
- CMake 3.15 or higher
- Mongoose library (included in dependencies)

## Building the Plugin

1. **Clone or download the plugin source code**

2. **Build with CMake**:
   ```bash
   mkdir build
   cd build
   cmake ..
   cmake --build . --config Release
   ```

3. **Copy the plugin**:
   - Copy `GameStatePlugin.dll` to your Bakkesmod plugins folder
   - Copy `GameStatePlugin.cfg` to your Bakkesmod plugins folder

## Configuration

Edit `GameStatePlugin.cfg` to customize plugin behavior:

```ini
# WebSocket URL for desktop app connection
websocket_url=ws://localhost:8080

# Use polling instead of hooks (not recommended)
use_polling=false

# Polling interval in milliseconds
polling_interval_ms=200

# Enable debug logging
enable_debug_logging=false
```

## Desktop App Integration

The plugin sends JSON messages in this format:

```json
{
  "state": "inGame",
  "timestamp": 1692700000
}
```

### Expected WebSocket Server

Your desktop app should:
1. Listen for WebSocket connections on the configured URL (default: `ws://localhost:8080`)
2. Accept incoming JSON messages with game state updates
3. Handle connection drops gracefully (the plugin will auto-reconnect)

## Plugin Architecture

### Core Components

- **GameStatePlugin**: Main plugin class implementing BakkesmodPlugin interface
- **WebSocketClient**: Handles communication with desktop application
- **GameStateDetector**: Detects and monitors game state changes

### Detection Methods

1. **Bakkesmod Hooks** (Preferred):
   - `MatchStarted` / `MatchEnded` - Game start/end detection
   - `ReplayStarted` / `ReplayEnded` - Replay mode detection
   - `PauseChanged` - Pause state detection
   - More efficient, lower CPU usage

2. **Polling Method** (Fallback):
   - Polls game state every 100-500ms
   - Used when hooks are not available
   - Configurable polling interval

## Usage

1. Install Bakkesmod for Rocket League
2. Copy the plugin files to your Bakkesmod plugins directory
3. Start your desktop application (WebSocket server)
4. Launch Rocket League
5. The plugin will automatically connect and start sending state updates

## Troubleshooting

### Plugin Not Loading
- Ensure Bakkesmod is properly installed
- Check Bakkesmod console for error messages
- Verify plugin files are in the correct directory

### No WebSocket Connection
- Ensure your desktop app is running and listening on the correct port
- Check firewall settings
- Verify WebSocket URL in configuration

### Incorrect State Detection
- Try enabling debug logging in the config
- Check if using polling vs hooks makes a difference
- Ensure Bakkesmod hooks are working properly

## Development

### Project Structure
```
GameStatePlugin/
├── src/
│   ├── GameStatePlugin.h/cpp     # Main plugin class
│   ├── WebSocketClient.h/cpp     # WebSocket communication
│   └── GameStateDetector.h/cpp   # Game state detection
├── CMakeLists.txt               # Build configuration
├── GameStatePlugin.cfg          # Plugin configuration
└── README.md                    # This file
```

### Building for Development
```bash
# Debug build
cmake -DCMAKE_BUILD_TYPE=Debug ..
cmake --build . --config Debug

# Release build
cmake -DCMAKE_BUILD_TYPE=Release ..
cmake --build . --config Release
```

## License

This plugin is provided as-is for educational and personal use.
