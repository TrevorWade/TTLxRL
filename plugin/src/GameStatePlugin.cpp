#include "GameStatePlugin.h"
#include "WebSocketClient.h"
#include "GameStateDetector.h"
#include <iostream>
#include <fstream>
#include <sstream>

// Plugin entry point macro for Bakkesmod
BAKKESMOD_PLUGIN(GameStatePlugin, "Game State Plugin", "1.0.0", PLUGINTYPE_FREEPLAY)

// Constructor/Destructor not needed for Bakkesmod plugins

// Called when the plugin is loaded by Bakkesmod
void GameStatePlugin::onLoad() {
	// Initialize current state
	currentState = GameState::unknown;
	lastStateChangeTime = std::chrono::steady_clock::now();

	// Load configuration from file
	loadConfig();

	// Create WebSocket client for communication with desktop app
	webSocketClient = std::make_unique<WebSocketClient>(websocketUrl);

	// Set WebSocket event callbacks
	webSocketClient->setConnectedCallback([this]() {
		onWebSocketConnected();
	});

	webSocketClient->setDisconnectedCallback([this]() {
		onWebSocketDisconnected();
	});

	webSocketClient->setErrorCallback([this](const std::string& error) {
		onWebSocketError(error);
	});

	// Create game state detector
	gameStateDetector = std::make_unique<GameStateDetector>(this);

	// Set game state change callback
	gameStateDetector->setStateChangedCallback([this](GameState newState) {
		onGameStateChanged(newState);
	});

	// Start detector and set up its internal hooks so it actually updates state
	// Use event-hook mode (non-polling) by default; polling interval kept from config for optional use
	gameStateDetector->startDetection(/*usePolling=*/usePolling, pollingIntervalMs);
	gameStateDetector->setupMatchHooks();
	gameStateDetector->setupReplayHooks();
	gameStateDetector->setupPauseHooks();

	// Setup Bakkesmod event hooks for real-time detection
	setupEventHooks();

	// Note: We're using event hooks instead of polling for better performance
	cvarManager->log("Using BakkesMod event hooks for real-time state detection");

	// Attempt to connect to desktop app
	if (!webSocketClient->connect()) {
		cvarManager->log("Failed to connect to desktop app WebSocket");
	} else {
		// Send a test message immediately after connection
		cvarManager->log("Sending test message to desktop app...");
		webSocketClient->sendJsonMessage("inMenu", getCurrentTimestamp());
		
		// Also send a test JSON message
		webSocketClient->sendJsonMessage("inMenu", getCurrentTimestamp());
	}

	cvarManager->log("GameStatePlugin loaded successfully");
}

// Called when the plugin is unloaded by Bakkesmod
void GameStatePlugin::onUnload() {
	cvarManager->log("GameStatePlugin unloading...");

	// Stop detection
	if (gameStateDetector) {
		gameStateDetector->stopDetection();
	}

	// Disconnect WebSocket
	if (webSocketClient) {
		webSocketClient->disconnect();
	}

	// Clean up resources
	gameStateDetector.reset();
	webSocketClient.reset();

	cvarManager->log("GameStatePlugin unloaded successfully");
}

// Load plugin configuration from file
void GameStatePlugin::loadConfig() {
	// Default configuration values
	websocketUrl = "ws://localhost:8080";  // Default desktop app WebSocket URL
	pollingIntervalMs = 200;                // 200ms polling interval
	usePolling = false;                     // Prefer hooks over polling

	// Try to load from config file
	std::ifstream configFile("GameStatePlugin.cfg");
	if (configFile.is_open()) {
		std::string line;
		while (std::getline(configFile, line)) {
			// Simple config parsing - look for key=value pairs
			size_t equalsPos = line.find('=');
			if (equalsPos != std::string::npos) {
				std::string key = line.substr(0, equalsPos);
				std::string value = line.substr(equalsPos + 1);

				if (key == "websocket_url") {
					websocketUrl = value;
				} else if (key == "polling_interval_ms") {
					pollingIntervalMs = std::stoi(value);
				} else if (key == "use_polling") {
					usePolling = (value == "true");
				}
			}
		}
		configFile.close();
	}
}

// Setup Bakkesmod event hooks for game state changes
void GameStatePlugin::setupEventHooks() {
	if (!gameWrapper) return;

	cvarManager->log("Setting up BakkesMod event hooks for real-time detection...");

	// Hook into game tick for continuous monitoring (this one works reliably)
	gameWrapper->HookEvent("Function Engine.GameViewportClient.Tick", [this](std::string eventName) {
		static int tickCount = 0;
		tickCount++;
		
		// Check state every 60 ticks (roughly 1 second at 60fps)
		if (tickCount % 60 == 0) {
			GameState newState = gameStateDetector->getCurrentState();
			if (newState != currentState) {
				cvarManager->log("State change detected via tick hook: " + gameStateToString(currentState) + " -> " + gameStateToString(newState));
				onGameStateChanged(newState);
			}
		}
	});

	// Try to hook into some common events (these may or may not work)
	try {
		// Hook into match events - using more generic names
		gameWrapper->HookEvent("Function TAGame.GameEvent_TA.OnMatchEnded", [this](std::string eventName) {
			cvarManager->log("Event: Match ended - sending inMenu state");
			sendStateUpdate(GameState::inMenu);
		});
	} catch (...) {
		cvarManager->log("Warning: Could not hook into match events");
	}

	try {
		// Hook into replay events
		gameWrapper->HookEvent("Function TAGame.GameEvent_TA.OnReplayStarted", [this](std::string eventName) {
			cvarManager->log("Event: Replay started - sending inReplay state");
			sendStateUpdate(GameState::inReplay);
		});
	} catch (...) {
		cvarManager->log("Warning: Could not hook into replay events");
	}

	cvarManager->log("BakkesMod event hooks setup completed - using tick-based detection as primary method");

	// Add manual command for testing state detection
	cvarManager->registerNotifier("gamestate_check", [this](std::vector<std::string> params) {
		cvarManager->log("Manual state check triggered!");
		GameState newState = gameStateDetector->getCurrentState();
		cvarManager->log("Current detected state: " + gameStateToString(newState));
		
		if (newState != currentState) {
			cvarManager->log("State change detected! Sending update...");
			onGameStateChanged(newState);
		} else {
			cvarManager->log("No state change detected");
		}
	}, "Manually check current game state", PERMISSION_ALL);
}

// Note: Polling methods removed - now using real-time BakkesMod event hooks

// Handle game state changes
void GameStatePlugin::onGameStateChanged(GameState newState) {
	// Only send updates if state actually changed
	if (newState == currentState) {
		return;  // No change, skip update
	}

	// Update current state and timestamp
	currentState = newState;
	lastStateChangeTime = std::chrono::steady_clock::now();

	// Send state update to desktop app
	sendStateUpdate(newState);

	// Log the state change
	cvarManager->log("Game state changed to: " + gameStateToString(newState));
}

// Send state update to desktop app via WebSocket
void GameStatePlugin::sendStateUpdate(GameState state) {
	if (!webSocketClient || !webSocketClient->isConnected()) {
		cvarManager->log("WebSocket not connected, cannot send state update");
		return;
	}

	std::string stateString = gameStateToString(state);
	long long timestamp = getCurrentTimestamp();

	webSocketClient->sendJsonMessage(stateString, timestamp);
}

// Convert GameState enum to string
std::string GameStatePlugin::gameStateToString(GameState state) {
	switch (state) {
		case GameState::inMenu: return "inMenu";
		case GameState::inGame: return "inGame";
		case GameState::inReplay: return "inReplay";
		case GameState::gamePaused: return "gamePaused";
		default: return "unknown";
	}
}

// Get current timestamp in Unix epoch format
long long GameStatePlugin::getCurrentTimestamp() {
	return std::chrono::duration_cast<std::chrono::seconds>(
		std::chrono::system_clock::now().time_since_epoch()
	).count();
}

// WebSocket connected callback
void GameStatePlugin::onWebSocketConnected() {
	cvarManager->log("WebSocket connected to desktop app");

	// Send current state immediately upon connection
	if (currentState != GameState::unknown) {
		sendStateUpdate(currentState);
	}
}

// WebSocket disconnected callback
void GameStatePlugin::onWebSocketDisconnected() {
	cvarManager->log("WebSocket disconnected from desktop app");

	// Attempt to reconnect after a delay
	// Note: In a real implementation, you might want to use a timer
	// or implement exponential backoff
}

// WebSocket error callback
void GameStatePlugin::onWebSocketError(const std::string& error) {
	cvarManager->log("WebSocket error: " + error);
}
