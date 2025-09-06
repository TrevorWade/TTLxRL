# GameStatePlugin Build Instructions

## Prerequisites

Before building the plugin, ensure you have:

### Required Software
1. **CMake** (version 3.15 or higher)
   - Download from: https://cmake.org/download/
   - Add to system PATH during installation

2. **Visual Studio Build Tools** (for C++ compilation)
   - Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Install "Desktop development with C++" workload

3. **Bakkesmod SDK**
   - Usually located in your Bakkesmod installation directory
   - Typical path: `C:\Users\[YourUsername]\AppData\Roaming\bakkesmod\bakkesmod\`

### Required Dependencies
- **Mongoose Library** (for WebSocket functionality)
  - Download from: https://github.com/cesanta/mongoose
  - Or use a package manager like vcpkg

## Building the Plugin

### Method 1: Using the Build Script (Recommended)

1. **Open Command Prompt or PowerShell** in the plugin directory
2. **Run the build script**:
   ```batch
   # For Command Prompt
   build_plugin.bat

   # For PowerShell
   .\build_plugin.ps1
   ```

### Method 2: Manual Build Steps

1. **Create build directory**:
   ```batch
   mkdir build
   cd build
   ```

2. **Configure with CMake**:
   ```batch
   cmake .. -DCMAKE_BUILD_TYPE=Release
   ```

   If you have Bakkesmod SDK in a custom location, specify it:
   ```batch
   cmake .. -DCMAKE_BUILD_TYPE=Release -DBAKKESMOD_SDK_DIR="C:\path\to\bakkesmod\sdk"
   ```

3. **Build the plugin**:
   ```batch
   cmake --build . --config Release
   ```

## Installation

1. **Locate the built files**:
   - `build\GameStatePlugin.dll` (the plugin)
   - `GameStatePlugin.cfg` (configuration file)

2. **Find your Bakkesmod plugins folder**:
   - Open Bakkesmod in Rocket League
   - Go to File → Open Bakkesmod Folder
   - Navigate to `plugins\` subdirectory

   **Typical path**: `C:\Users\[YourUsername]\AppData\Roaming\bakkesmod\bakkesmod\plugins\`

3. **Copy the files**:
   - Copy `GameStatePlugin.dll` to the plugins folder
   - Copy `GameStatePlugin.cfg` to the plugins folder

4. **Restart Rocket League** or reload Bakkesmod plugins

## Configuration

Edit `GameStatePlugin.cfg` to customize plugin behavior:

```ini
# WebSocket connection settings
websocket_url=ws://localhost:8080
websocket_reconnect_interval_ms=5000

# Detection method settings
use_polling=false  # true = polling, false = hooks (recommended)

# Polling interval in milliseconds
polling_interval_ms=200

# Logging settings
enable_debug_logging=false
```

## Testing the Plugin

1. **Start the example desktop app**:
   ```batch
   cd example_desktop_app
   npm install
   npm start
   ```

2. **Launch Rocket League** with Bakkesmod loaded

3. **Check Bakkesmod console** for connection messages:
   ```
   GameStatePlugin loaded successfully
   WebSocket connected to desktop app
   Game state changed to: inMenu
   ```

4. **Monitor the desktop app console** for state updates

## Troubleshooting

### Build Issues

**"CMake not found"**
- Ensure CMake is installed and added to system PATH
- Restart Command Prompt/PowerShell after installation

**"Cannot find Bakkesmod SDK"**
- Specify the SDK path manually:
  ```batch
  cmake .. -DBAKKESMOD_SDK_DIR="C:\path\to\bakkesmod\sdk"
  ```

**"Missing dependencies"**
- Install Mongoose library
- Add include and library paths to CMake

### Runtime Issues

**"Plugin failed to load"**
- Check Bakkesmod console for error messages
- Ensure all dependencies are correctly linked

**"WebSocket connection failed"**
- Verify the desktop app is running on the correct port
- Check firewall settings for port 8080

**"No state changes detected"**
- Try enabling polling mode in configuration
- Check Bakkesmod console for hook registration messages

## File Structure

After building, your plugin directory should contain:

```
GameStatePlugin/
├── build/
│   ├── GameStatePlugin.dll          # The plugin (copy to Bakkesmod)
│   ├── GameStatePlugin.lib          # Import library
│   └── ... (other build files)
├── src/                             # Source code
├── GameStatePlugin.cfg              # Configuration (copy to Bakkesmod)
├── CMakeLists.txt                   # Build configuration
├── build_plugin.bat                 # Windows build script
├── build_plugin.ps1                 # PowerShell build script
└── BUILD_INSTRUCTIONS.md            # This file
```

## Getting Help

If you encounter issues:

1. **Check Bakkesmod console** for error messages
2. **Enable debug logging** in the configuration file
3. **Verify all prerequisites** are correctly installed
4. **Check the example desktop app** is running correctly

For additional support, check the Bakkesmod documentation or community forums.
