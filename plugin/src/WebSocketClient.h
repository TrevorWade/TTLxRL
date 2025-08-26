#pragma once

#include <string>
#include <memory>
#include <functional>
#include <thread>
#include <atomic>
#include <winsock2.h>
#include <ws2tcpip.h>

// WebSocket message structure
struct WebSocketMessage {
    std::string payload;
    bool isBinary;
};

// Callbacks for connection events
using ConnectedCallback = std::function<void()>;
using DisconnectedCallback = std::function<void()>;
using ErrorCallback = std::function<void(const std::string&)>;

class WebSocketClient {
public:
    WebSocketClient(const std::string& url);
    ~WebSocketClient();

    bool connect();
    void disconnect();
    bool isConnected() const;
    void sendMessage(const std::string& message);
    void sendJsonMessage(const std::string& state, long long timestamp);

    // Callback setters
    void setConnectedCallback(ConnectedCallback callback);
    void setDisconnectedCallback(DisconnectedCallback callback);
    void setErrorCallback(ErrorCallback callback);

private:
    // WebSocket connection details
    std::string websocketUrl;
    std::string host;
    std::string port;
    std::string path;
    
    // Network connection
    SOCKET sock;
    std::thread networkThread;
    std::atomic<bool> running;
    std::atomic<bool> connected;

    // Callbacks
    ConnectedCallback onConnected;
    DisconnectedCallback onDisconnected;
    ErrorCallback onError;

    // Private methods
    bool parseWebSocketUrl(const std::string& url);
    bool connectToServer();
    bool performWebSocketHandshake();
    void networkLoop();
    void cleanup();
    std::string generateWebSocketKey();
    std::string base64Encode(const std::string& input);

    // Disable copying
    WebSocketClient(const WebSocketClient&) = delete;
    WebSocketClient& operator=(const WebSocketClient&) = delete;
};
