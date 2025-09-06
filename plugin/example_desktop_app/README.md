# GameState Desktop App Example

A simple Node.js WebSocket server that demonstrates how to receive and handle game state updates from the Rocket League GameStatePlugin.

## Features

- **WebSocket Server**: Listens for connections on port 8080
- **Real-time Updates**: Receives and processes game state changes
- **State-specific Actions**: Handles different game states appropriately
- **Connection Management**: Handles plugin connections and disconnections
- **Error Handling**: Robust error handling and logging

## Installation

1. **Install Node.js** (version 14 or higher)
2. **Navigate to the example app directory**:
   ```bash
   cd example_desktop_app
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```

## Usage

### Start the Server

```bash
# Production mode
npm start

# Development mode (auto-restart on changes)
npm run dev
```

The server will start on `ws://localhost:8080` and display:
```
🚀 GameState Desktop App Server starting on port 8080
📡 Waiting for connections from Rocket League plugin...
🎯 Ready to receive game state updates from Rocket League!
```

### Integration with GameStatePlugin

The desktop app automatically integrates with the plugin:

1. **Plugin Connection**: When the Rocket League plugin starts, it connects to this server
2. **State Updates**: The plugin sends JSON messages whenever the game state changes
3. **Auto-reconnect**: If the connection drops, the plugin will automatically reconnect

### Expected Message Format

The plugin sends messages in this JSON format:

```json
{
  "state": "inGame",
  "timestamp": 1692700000
}
```

**Possible states:**
- `"inMenu"` - Player is in main menu or pause menu
- `"inGame"` - Player is actively playing
- `"inReplay"` - Player is watching a replay (including goal replays)
- `"gamePaused"` - Game is paused mid-match

## Code Structure

```
example_desktop_app/
├── server.js          # Main WebSocket server
├── package.json       # Dependencies and scripts
└── README.md         # This documentation
```

## Customization

### Adding New State Handlers

Edit the `handleStateSpecificActions()` function in `server.js`:

```javascript
function handleStateSpecificActions(state) {
    switch (state) {
        case 'inMenu':
            // Your custom menu actions here
            console.log('Player is in menu - show menu UI');
            break;

        case 'inGame':
            // Your custom game actions here
            console.log('Player is in game - execute queued actions');
            executeQueuedActions();
            break;

        // Add more cases as needed
    }
}
```

### Modifying Server Port

Change the `PORT` constant at the top of `server.js`:

```javascript
const PORT = 3000;  // Change from 8080 to 3000
```

Make sure to update your plugin configuration accordingly!

### Adding UI

This is a console-based example. To add a GUI:

1. **Electron**: Create a desktop application with a graphical interface
2. **Web App**: Create a web interface that connects to this WebSocket server
3. **System Tray**: Add system tray notifications for state changes

## Troubleshooting

### Plugin Can't Connect

1. **Check if server is running**:
   ```bash
   netstat -an | findstr :8080
   ```

2. **Verify firewall settings**: Ensure port 8080 is not blocked

3. **Check plugin configuration**: Ensure `websocket_url` matches server address

### No State Updates

1. **Check Rocket League**: Ensure the game is running
2. **Verify Bakkesmod**: Ensure Bakkesmod is loaded and plugin is active
3. **Check console output**: Look for connection and error messages

### Permission Errors

If you get permission errors on Windows:
```bash
# Run command prompt as administrator, then:
netsh http add urlacl url=http://localhost:8080/ user=Everyone
```

## Development

### Adding New Features

1. **Database Integration**: Store state history in a database
2. **REST API**: Add HTTP endpoints for additional functionality
3. **Authentication**: Add security for production use
4. **Multiple Clients**: Support multiple plugin connections

### Debugging

Enable verbose logging by modifying the console.log statements in `server.js`.

## Production Considerations

This is a basic example. For production use, consider:

- **Security**: Add authentication and encryption
- **Scalability**: Handle multiple concurrent connections
- **Persistence**: Store state history and analytics
- **Monitoring**: Add health checks and monitoring
- **Error Recovery**: Implement comprehensive error handling

## Related Files

- `../GameStatePlugin.cfg` - Plugin configuration
- `../README.md` - Main plugin documentation
- `../src/` - Plugin source code

## License

This example is provided as-is for educational purposes.
