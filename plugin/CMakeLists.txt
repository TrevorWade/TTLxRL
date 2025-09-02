# Bakkesmod Plugin CMake Configuration
cmake_minimum_required(VERSION 3.15)
project(GameStatePlugin)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Bakkesmod plugin settings
set(PLUGIN_NAME "GameStatePlugin")
set(PLUGIN_VERSION "1.0.0")
set(PLUGIN_AUTHOR "YourName")

# Source files
set(SOURCES
    src/GameStatePlugin.cpp
    src/WebSocketClient.cpp
    src/GameStateDetector.cpp
)

# Header files
set(HEADERS
    src/GameStatePlugin.h
    src/WebSocketClient.h
    src/GameStateDetector.h
)

# Create the plugin DLL
add_library(${PLUGIN_NAME} SHARED ${SOURCES} ${HEADERS})

# Include directories
target_include_directories(${PLUGIN_NAME} PRIVATE
    src
    ${CMAKE_SOURCE_DIR}/bakkesmodsdk/include
    ${CMAKE_SOURCE_DIR}/bakkesmodsdk/BakkesModSDK-master/include
)

# Link required libraries
target_link_libraries(${PLUGIN_NAME}
    ${CMAKE_SOURCE_DIR}/bakkesmodsdk/lib/pluginsdk.lib
    ws2_32
)

# Set output properties
set_target_properties(${PLUGIN_NAME} PROPERTIES
    OUTPUT_NAME ${PLUGIN_NAME}
    SUFFIX ".dll"
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}
    LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}
)

# Copy plugin config
configure_file(
    ${CMAKE_SOURCE_DIR}/GameStatePlugin.cfg
    ${CMAKE_BINARY_DIR}/GameStatePlugin.cfg
    COPYONLY
)
