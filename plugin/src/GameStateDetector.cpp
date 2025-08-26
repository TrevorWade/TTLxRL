#include "GameStateDetector.h"
#include "bakkesmod/wrappers/GameWrapper.h"
#include "bakkesmod/wrappers/GameEvent/ServerWrapper.h"
#include "bakkesmod/wrappers/GameEvent/ReplayWrapper.h"
#include "bakkesmod/wrappers/GameObject/CameraWrapper.h"
#include "bakkesmod/plugin/bakkesmodsdk.h"
#include "utils/parser.h"
#include <iostream>
#include <vector>

GameStateDetector::GameStateDetector(BakkesMod::Plugin::BakkesModPlugin* plugin)
    : bakkesModPlugin(plugin), currentState(GameState::unknown),
      isDetecting(false), usePollingMode(false), pollingInterval(200) {
}

GameStateDetector::~GameStateDetector() {
    stopDetection();
}

// Start game state detection
void GameStateDetector::startDetection(bool usePolling, int pollingIntervalMs) {
    if (isDetecting) return;

    usePollingMode = usePolling;
    pollingInterval = pollingIntervalMs;
    isDetecting = true;

    if (usePollingMode) {
        // Start polling thread
        pollingThread = std::make_unique<std::thread>(
            &GameStateDetector::pollingLoop, this
        );
    }
}

// Stop game state detection
void GameStateDetector::stopDetection() {
    if (!isDetecting) return;

    isDetecting = false;

    if (pollingThread && pollingThread->joinable()) {
        pollingThread->join();
    }

    pollingThread.reset();
}

// Get current game state
GameState GameStateDetector::getCurrentState() const {
    return currentState.load();
}

// Force a single detection/update pass
void GameStateDetector::detectOnce() {
    GameState newState = detectGameState();
    updateState(newState);
}

// Setup Bakkesmod hooks for match events
void GameStateDetector::setupMatchHooks() {
    if (!bakkesModPlugin) return;

    std::cout << "GameStateDetector: Setting up match hooks..." << std::endl;

    // Hook into match start event
    bakkesModPlugin->cvarManager->registerNotifier("GameState_MatchStarted",
        [this](std::vector<std::string> params) {
            std::cout << "GameStateDetector: Match started event triggered!" << std::endl;
            onMatchStarted();
        }, "", PERMISSION_ALL);

    // Hook into match end event
    bakkesModPlugin->cvarManager->registerNotifier("GameState_MatchEnded",
        [this](std::vector<std::string> params) {
            std::cout << "GameStateDetector: Match ended event triggered!" << std::endl;
            onMatchEnded();
        }, "", PERMISSION_ALL);

    // Hook into game tick for continuous monitoring
    bakkesModPlugin->gameWrapper->HookEvent("Function Engine.GameViewportClient.Tick",
        [this](std::string eventName) {
            if (!usePollingMode && isDetecting) {
                GameState newState = detectGameState();
                if (newState != currentState.load()) {
                    updateState(newState);
                }
            }
        });

    // Add a manual command to test state detection
    bakkesModPlugin->cvarManager->registerNotifier("gamestate_detect",
        [this](std::vector<std::string> params) {
            std::cout << "GameStateDetector: Manual state detection triggered!" << std::endl;
            GameState newState = detectGameState();
            std::cout << "GameStateDetector: Detected state: " << (int)newState << std::endl;
            updateState(newState);
        }, "Manually trigger game state detection", PERMISSION_ALL);

    std::cout << "GameStateDetector: Match hooks setup completed" << std::endl;
}

// Setup Bakkesmod hooks for replay events
void GameStateDetector::setupReplayHooks() {
    if (!bakkesModPlugin) return;

    // Hook into replay start
    bakkesModPlugin->cvarManager->registerNotifier("GameState_ReplayStarted",
        [this](std::vector<std::string> params) {
            onReplayStarted();
        }, "", PERMISSION_ALL);

    // Hook into replay end
    bakkesModPlugin->cvarManager->registerNotifier("GameState_ReplayEnded",
        [this](std::vector<std::string> params) {
            onReplayEnded();
        }, "", PERMISSION_ALL);
}

// Setup Bakkesmod hooks for pause events
void GameStateDetector::setupPauseHooks() {
    if (!bakkesModPlugin) return;

    // Hook into pause toggle
    bakkesModPlugin->cvarManager->registerNotifier("GameState_PauseChanged",
        [this](std::vector<std::string> params) {
            if (!params.empty()) {
                bool isPaused = (params[0] == "1");
                onPauseChanged(isPaused);
            }
        }, "", PERMISSION_ALL);
}

// Set callback for state changes
void GameStateDetector::setStateChangedCallback(StateChangedCallback callback) {
    onStateChanged = callback;
}

// Detect current game state using Bakkesmod API
GameState GameStateDetector::detectGameState() {
    if (!bakkesModPlugin) {
        std::cout << "GameStateDetector: No plugin reference!" << std::endl;
        return GameState::inMenu;
    }

    auto gameWrapper = bakkesModPlugin->gameWrapper;
    if (!gameWrapper) {
        std::cout << "GameStateDetector: No game wrapper!" << std::endl;
        return GameState::inMenu;
    }

    bool isInGame = gameWrapper->IsInGame();
    bool isInReplay = gameWrapper->IsInReplay();
    
    std::cout << "GameStateDetector: IsInGame=" << isInGame << ", IsInReplay=" << isInReplay << std::endl;

    if (!isInGame) {
        std::cout << "GameStateDetector: Not in game, returning inMenu" << std::endl;
        return GameState::inMenu;
    }

    // Check if we're in a replay (including goal replays)
    if (isInReplay) {
        std::cout << "GameStateDetector: In replay, returning inReplay" << std::endl;
        return GameState::inReplay;
    }

    // Check if game is paused
    if (isGamePaused()) {
        std::cout << "GameStateDetector: Game paused, returning gamePaused" << std::endl;
        return GameState::gamePaused;
    }

    // Check if we're in an active match or free play
    ServerWrapper server = gameWrapper->GetGameEventAsServer();
    if (!server.IsNull()) {
        std::cout << "GameStateDetector: In active match, returning inGame" << std::endl;
        return GameState::inGame;
    }

    // If we're in game but no server wrapper, we're likely in free play
    if (isInGame) {
        std::cout << "GameStateDetector: In free play, returning inGame" << std::endl;
        return GameState::inGame;
    }

    std::cout << "GameStateDetector: Default case, returning inMenu" << std::endl;
    return GameState::inMenu;
}

// Check if currently in main menu
bool GameStateDetector::isInMainMenu() {
    if (!bakkesModPlugin) return true;

    auto gameWrapper = bakkesModPlugin->gameWrapper;

    // If not in game, we're likely in menu
    return !gameWrapper->IsInGame() && !gameWrapper->IsInReplay();
}

// Check if actively in a game
bool GameStateDetector::isInGame() {
    if (!bakkesModPlugin) return false;

    auto gameWrapper = bakkesModPlugin->gameWrapper;

    if (!gameWrapper->IsInGame()) return false;

    ServerWrapper server = gameWrapper->GetGameEventAsServer();
    return !server.IsNull() && !gameWrapper->IsInReplay();
}

// Check if in replay mode
bool GameStateDetector::isInReplay() {
    if (!bakkesModPlugin) return false;

    return bakkesModPlugin->gameWrapper->IsInReplay();
}

// Check if game is paused
bool GameStateDetector::isGamePaused() {
    if (!bakkesModPlugin) return false;

    auto gameWrapper = bakkesModPlugin->gameWrapper;

    // Check if the game is paused by examining game speed
    if (gameWrapper->IsInGame()) {
        ServerWrapper server = gameWrapper->GetGameEventAsServer();
        if (!server.IsNull()) {
            // Game speed of 0 typically indicates paused state
            return server.GetGameSpeed() == 0.0f;
        }
    }

    return false;
}

// Hook handlers
void GameStateDetector::onMatchStarted() {
    updateState(GameState::inGame);
}

void GameStateDetector::onMatchEnded() {
    updateState(GameState::inMenu);
}

void GameStateDetector::onReplayStarted() {
    updateState(GameState::inReplay);
}

void GameStateDetector::onReplayEnded() {
    // After replay ends, go back to menu or game depending on context
    GameState newState = detectGameState();
    updateState(newState);
}

void GameStateDetector::onPauseChanged(bool isPaused) {
    if (isPaused) {
        updateState(GameState::gamePaused);
    } else {
        // When unpaused, determine if we're in game or replay
        GameState newState = detectGameState();
        updateState(newState);
    }
}

// Update current state and notify callback
void GameStateDetector::updateState(GameState newState) {
    if (newState != currentState.load()) {
        currentState = newState;

        if (onStateChanged) {
            onStateChanged(newState);
        }
    }
}

// Polling loop for fallback detection method
void GameStateDetector::pollingLoop() {
    while (isDetecting) {
        GameState newState = detectGameState();
        updateState(newState);

        std::this_thread::sleep_for(std::chrono::milliseconds(pollingInterval));
    }
}


