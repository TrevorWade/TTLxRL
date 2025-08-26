#pragma once

#include "GameStatePlugin.h"
#include <memory>
#include <thread>
#include <atomic>
#include <chrono>

// Use the BakkesMod namespace
using namespace BakkesMod::Plugin;

// Game state detection and polling system
class GameStateDetector {
public:
    // Callback function type
    using StateChangedCallback = std::function<void(GameState)>;

    GameStateDetector(BakkesMod::Plugin::BakkesModPlugin* plugin);
    ~GameStateDetector();

    // Detection methods
    void startDetection(bool usePolling = true, int pollingIntervalMs = 200);
    void stopDetection();
    GameState getCurrentState() const;
    void detectOnce();

    // Hook setup methods
    void setupMatchHooks();
    void setupReplayHooks();
    void setupPauseHooks();

    // Callback setter
    void setStateChangedCallback(StateChangedCallback callback);

private:
    // Plugin reference for accessing game data
    BakkesMod::Plugin::BakkesModPlugin* bakkesModPlugin;

    // Detection state
    std::atomic<GameState> currentState;
    std::atomic<bool> isDetecting;
    bool usePollingMode;
    int pollingInterval;

    // Polling thread
    std::unique_ptr<std::thread> pollingThread;

    // Callbacks
    StateChangedCallback onStateChanged;

    // Detection methods
    GameState detectGameState();
    bool isInMainMenu();
    bool isInGame();
    bool isInReplay();
    bool isGamePaused();

    // Hook handlers
    void onMatchStarted();
    void onMatchEnded();
    void onReplayStarted();
    void onReplayEnded();
    void onPauseChanged(bool isPaused);

    // Polling loop
    void pollingLoop();
    void updateState(GameState newState);

    // Disable copying
    GameStateDetector(const GameStateDetector&) = delete;
    GameStateDetector& operator=(const GameStateDetector&) = delete;
};
