const WebSocket = require('ws');

// WebSocket server configuration
const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

// Store current game state
let currentGameState = {
    state: 'unknown',
    timestamp: 0,
    lastUpdate: new Date().toISOString()
};

console.log(`🚀 GameState Desktop App Server starting on port ${PORT}`);
console.log(`📡 Waiting for connections from Rocket League plugin...`);

// Handle new WebSocket connections
wss.on('connection', (ws, req) => {
    console.log(`🔗 Plugin connected from ${req.socket.remoteAddress}`);

    // Send current state to newly connected plugin
    ws.send(JSON.stringify(currentGameState, null, 2));

    // Handle messages from plugin
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            handleGameStateUpdate(data);
        } catch (error) {
            console.error('❌ Error parsing message:', error.message);
        }
    });

    // Handle connection close
    ws.on('close', () => {
        console.log('📴 Plugin disconnected');
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });
});

// Handle game state updates from plugin
function handleGameStateUpdate(data) {
    const { state, timestamp } = data;

    // Only process if state actually changed
    if (state !== currentGameState.state) {
        const previousState = currentGameState.state;
        currentGameState = {
            state,
            timestamp,
            lastUpdate: new Date().toISOString()
        };

        console.log(`🎮 Game state changed: ${previousState} → ${state}`);
        console.log(`⏰ Timestamp: ${new Date(timestamp * 1000).toLocaleString()}`);

        // Here you would typically:
        // 1. Update your desktop app UI
        // 2. Execute queued actions based on game state
        // 3. Send notifications to other systems
        // 4. Log the state change for analytics

        handleStateSpecificActions(state);
    }
}

// Handle actions specific to each game state
function handleStateSpecificActions(state) {
    switch (state) {
        case 'inMenu':
            console.log('🏠 Player is in main menu');
            // Actions for when player is in menu:
            // - Show menu-specific UI
            // - Pause background processes
            // - Enable menu-related features
            break;

        case 'inGame':
            console.log('⚽ Player is actively playing');
            // Actions for when player is in game:
            // - Show game overlay
            // - Start recording gameplay
            // - Enable game-specific features
            // - Execute queued in-game actions
            break;

        case 'inReplay':
            console.log('📼 Player is watching replay');
            // Actions for when player is in replay:
            // - Show replay-specific UI
            // - Pause real-time features
            // - Enable replay analysis tools
            break;

        case 'gamePaused':
            console.log('⏸️ Game is paused');
            // Actions for when game is paused:
            // - Show pause menu overlay
            // - Temporarily halt automated actions
            // - Enable pause-specific features
            break;

        default:
            console.log('❓ Unknown game state:', state);
            break;
    }
}

// Handle server shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    wss.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    wss.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Display server information
console.log(`\n📊 Server Information:`);
console.log(`   Port: ${PORT}`);
console.log(`   Protocol: WebSocket`);
console.log(`   Expected message format:`);
console.log(`   { "state": "inGame", "timestamp": 1692700000 }`);
console.log(`\n🎯 Ready to receive game state updates from Rocket League!`);
