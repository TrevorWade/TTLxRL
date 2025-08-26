#pragma once

#include "bakkesmod/plugin/bakkesmodplugin.h"
#include <memory>
#include <string>
#include <chrono>

// Use the BakkesMod namespace
using namespace BakkesMod::Plugin;

class WebSocketClient;
class GameStateDetector;

// Game state enumeration
enum class GameState {
    inMenu,
    inGame,
    inReplay,
    gamePaused,
    unknown
};

// Main plugin class that inherits from BakkesmodPlugin
class GameStatePlugin : public BakkesMod::Plugin::BakkesModPlugin {
public:
    // BakkesmodPlugin interface methods
    virtual void onLoad();
    virtual void onUnload();

    // Game state change callback
    void onGameStateChanged(GameState newState);

    // WebSocket event callbacks
    void onWebSocketConnected();
    void onWebSocketDisconnected();
    void onWebSocketError(const std::string& error);

private:
    // Plugin components
    std::unique_ptr<WebSocketClient> webSocketClient;
    std::unique_ptr<GameStateDetector> gameStateDetector;

    // State tracking
    GameState currentState;
    std::chrono::steady_clock::time_point lastStateChangeTime;

    // Configuration
    std::string websocketUrl;
    int pollingIntervalMs;
    bool usePolling;

    // Private methods
    void loadConfig();
    void setupEventHooks();
    void setupPolling();
    void setupSimplePolling();
    void sendStateUpdate(GameState state);
    std::string gameStateToString(GameState state);
    long long getCurrentTimestamp();
};
