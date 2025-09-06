#include "WebSocketClient.h"
#include <iostream>
#include <sstream>
#include <random>
#include <iomanip>

// Initialize Winsock
static bool winsockInitialized = false;
static void initWinsock() {
    if (!winsockInitialized) {
        WSADATA wsaData;
        if (WSAStartup(MAKEWORD(2, 2), &wsaData) == 0) {
            winsockInitialized = true;
        }
    }
}

// Create WebSocket client with specified URL
WebSocketClient::WebSocketClient(const std::string& url)
    : websocketUrl(url), sock(INVALID_SOCKET), running(false), connected(false) {
    
    // Initialize Winsock
    initWinsock();
    
    // Parse the WebSocket URL
    if (!parseWebSocketUrl(url)) {
        std::cout << "WebSocketClient: Failed to parse URL: " << url << std::endl;
    }
}

WebSocketClient::~WebSocketClient() {
    disconnect();
}

// Parse WebSocket URL (ws://host:port/path)
bool WebSocketClient::parseWebSocketUrl(const std::string& url) {
    if (url.substr(0, 5) != "ws://") {
        return false;
    }
    
    std::string remaining = url.substr(5);
    size_t slashPos = remaining.find('/');
    
    if (slashPos != std::string::npos) {
        path = remaining.substr(slashPos);
        remaining = remaining.substr(0, slashPos);
    } else {
        path = "/";
    }
    
    size_t colonPos = remaining.find(':');
    if (colonPos != std::string::npos) {
        host = remaining.substr(0, colonPos);
        port = remaining.substr(colonPos + 1);
    } else {
        host = remaining;
        port = "80";
    }
    
    return true;
}

// Connect to WebSocket server
bool WebSocketClient::connect() {
    if (running) {
        return connected.load();
    }

    if (!parseWebSocketUrl(websocketUrl)) {
        std::cout << "WebSocketClient: Invalid URL format" << std::endl;
        return false;
    }

    if (!connectToServer()) {
        std::cout << "WebSocketClient: Failed to connect to server" << std::endl;
        return false;
    }

    if (!performWebSocketHandshake()) {
        std::cout << "WebSocketClient: WebSocket handshake failed" << std::endl;
        cleanup();
        return false;
    }

    connected = true;
    running = true;

    // Start network thread
    networkThread = std::thread(&WebSocketClient::networkLoop, this);

    std::cout << "WebSocketClient: Connected to " << websocketUrl << std::endl;
    
    if (onConnected) {
        onConnected();
    }

    return true;
}

// Connect to TCP server
bool WebSocketClient::connectToServer() {
    sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sock == INVALID_SOCKET) {
        return false;
    }

    struct addrinfo hints, *result;
    ZeroMemory(&hints, sizeof(hints));
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_protocol = IPPROTO_TCP;

    if (getaddrinfo(host.c_str(), port.c_str(), &hints, &result) != 0) {
        closesocket(sock);
        sock = INVALID_SOCKET;
        return false;
    }

    if (::connect(sock, result->ai_addr, (int)result->ai_addrlen) == SOCKET_ERROR) {
        freeaddrinfo(result);
        closesocket(sock);
        sock = INVALID_SOCKET;
        return false;
    }

    freeaddrinfo(result);
    return true;
}

// Perform WebSocket handshake
bool WebSocketClient::performWebSocketHandshake() {
    std::string key = generateWebSocketKey();
    
    std::string request = "GET " + path + " HTTP/1.1\r\n";
    request += "Host: " + host + ":" + port + "\r\n";
    request += "Upgrade: websocket\r\n";
    request += "Connection: Upgrade\r\n";
    request += "Sec-WebSocket-Key: " + key + "\r\n";
    request += "Sec-WebSocket-Version: 13\r\n";
    request += "\r\n";

    if (send(sock, request.c_str(), (int)request.length(), 0) == SOCKET_ERROR) {
        return false;
    }

    // Read response (simplified - just check for 101 status)
    char buffer[1024];
    int bytesReceived = recv(sock, buffer, sizeof(buffer) - 1, 0);
    if (bytesReceived > 0) {
        buffer[bytesReceived] = '\0';
        std::string response(buffer);
        return response.find("HTTP/1.1 101") != std::string::npos;
    }

    return false;
}

// Generate WebSocket key for handshake
std::string WebSocketClient::generateWebSocketKey() {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 255);
    
    std::string key;
    for (int i = 0; i < 16; ++i) {
        key += (char)dis(gen);
    }
    
    return base64Encode(key);
}

// Simple base64 encoding
std::string WebSocketClient::base64Encode(const std::string& input) {
    const std::string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string result;
    int val = 0, valb = -6;
    
    for (unsigned char c : input) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            result.push_back(chars[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    
    if (valb > -6) result.push_back(chars[((val << 8) >> (valb + 8)) & 0x3F]);
    while (result.size() % 4) result.push_back('=');
    
    return result;
}

// Disconnect from WebSocket server
void WebSocketClient::disconnect() {
    if (!running) return;

    running = false;
    connected = false;

    if (networkThread.joinable()) {
        networkThread.join();
    }

    cleanup();

    if (onDisconnected) {
        onDisconnected();
    }

    std::cout << "WebSocketClient: Disconnected" << std::endl;
}

// Check if WebSocket is connected
bool WebSocketClient::isConnected() const {
    return connected.load();
}

// Send text message to WebSocket server
void WebSocketClient::sendMessage(const std::string& message) {
    if (!connected) {
        std::cout << "WebSocketClient: Not connected, cannot send message" << std::endl;
        return;
    }

    // Create WebSocket frame with proper masking (required for client->server)
    std::string frame;
    frame += (char)0x81; // FIN + text frame
    
    // Generate random 4-byte mask key
    unsigned char maskKey[4];
    for (int i = 0; i < 4; ++i) {
        maskKey[i] = rand() % 256;
    }
    
    size_t payloadLen = message.length();
    
    if (payloadLen < 126) {
        frame += (char)(0x80 | payloadLen); // MASK bit set + length
    } else if (payloadLen < 65536) {
        frame += (char)126;
        frame += (char)((payloadLen >> 8) & 0xFF);
        frame += (char)(payloadLen & 0xFF);
    } else {
        frame += (char)127;
        for (int i = 7; i >= 0; --i) {
            frame += (char)((payloadLen >> (i * 8)) & 0xFF);
        }
    }
    
    // Add mask key
    frame.append((char*)maskKey, 4);
    
    // XOR payload with mask key
    for (size_t i = 0; i < message.size(); i++) {
        frame += (char)(message[i] ^ maskKey[i % 4]);
    }

    if (send(sock, frame.c_str(), (int)frame.length(), 0) == SOCKET_ERROR) {
        std::cout << "WebSocketClient: Failed to send message" << std::endl;
        connected = false;
    } else {
        std::cout << "WebSocketClient: Sent message: " << message << std::endl;
    }
}

// Send JSON message with game state and timestamp
void WebSocketClient::sendJsonMessage(const std::string& state, long long timestamp) {
    std::stringstream jsonStream;
    jsonStream << "{\"state\":\"" << state << "\",\"timestamp\":" << timestamp << "}";
    
    sendMessage(jsonStream.str());
}

// Set callback for connection established
void WebSocketClient::setConnectedCallback(ConnectedCallback callback) {
    onConnected = callback;
}

// Set callback for disconnection
void WebSocketClient::setDisconnectedCallback(DisconnectedCallback callback) {
    onDisconnected = callback;
}

// Set callback for errors
void WebSocketClient::setErrorCallback(ErrorCallback callback) {
    onError = callback;
}

// Network loop for receiving messages
void WebSocketClient::networkLoop() {
    char buffer[1024];
    
    while (running && connected) {
        int bytesReceived = recv(sock, buffer, sizeof(buffer) - 1, 0);
        
        if (bytesReceived > 0) {
            buffer[bytesReceived] = '\0';
            // Handle incoming WebSocket messages (simplified)
            std::cout << "WebSocketClient: Received: " << buffer << std::endl;
        } else if (bytesReceived == 0) {
            // Connection closed by server
            connected = false;
            break;
        } else {
            // Error
            if (WSAGetLastError() != WSAEWOULDBLOCK) {
                connected = false;
                break;
            }
        }
        
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
}

// Cleanup resources
void WebSocketClient::cleanup() {
    if (sock != INVALID_SOCKET) {
        closesocket(sock);
        sock = INVALID_SOCKET;
    }
}
