@echo off
echo ======================================
echo GameStatePlugin Build Script
echo ======================================
echo.

REM Check if we're in the right directory
if not exist "CMakeLists.txt" (
    echo Error: CMakeLists.txt not found.
    echo Please run this script from the plugin root directory.
    pause
    exit /b 1
)

echo Step 1: Creating build directory...
if not exist "build" mkdir build

echo.
echo Step 2: Configuring with CMake...
cd build

REM Clean any existing files
if exist CMakeCache.txt del CMakeCache.txt
if exist CMakeFiles rmdir /s /q CMakeFiles

REM Try Visual Studio generators
echo Trying Visual Studio 17 2022...
"C:\Program Files\CMake\bin\cmake.exe" .. -G "Visual Studio 17 2022" -A x64

if errorlevel 1 (
    REM Clean and try next generator
    if exist CMakeCache.txt del CMakeCache.txt
    if exist CMakeFiles rmdir /s /q CMakeFiles
    echo Trying Visual Studio 16 2019...
    "C:\Program Files\CMake\bin\cmake.exe" .. -G "Visual Studio 16 2019" -A x64

    if errorlevel 1 (
        REM Clean and try next generator
        if exist CMakeCache.txt del CMakeCache.txt
        if exist CMakeFiles rmdir /s /q CMakeFiles
        echo Trying Visual Studio 15 2017...
        "C:\Program Files\CMake\bin\cmake.exe" .. -G "Visual Studio 15 2017" -A x64

        if errorlevel 1 (
            echo.
            echo Error: CMake configuration failed.
            echo Please ensure:
            echo - Visual Studio Build Tools with C++ workload are installed
            echo - Bakkesmod SDK is available
            echo - CMake is working (found at C:\Program Files\CMake\bin\cmake.exe)
            pause
            exit /b 1
        )
    )
)

echo.
echo Step 3: Building the plugin...
"C:\Program Files\CMake\bin\cmake.exe" --build . --config Release

if errorlevel 1 (
    echo.
    echo Error: Build failed.
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo ======================================
echo Build completed successfully!
echo ======================================
echo.
echo The plugin files are located in:
echo build\GameStatePlugin.dll
echo GameStatePlugin.cfg
echo.
echo To install:
echo 1. Copy GameStatePlugin.dll to your Bakkesmod plugins folder
echo 2. Copy GameStatePlugin.cfg to your Bakkesmod plugins folder
echo.
echo Your Bakkesmod plugins folder is typically:
echo C:\Users\%USERNAME%\AppData\Roaming\bakkesmod\bakkesmod\plugins\
echo.

pause
