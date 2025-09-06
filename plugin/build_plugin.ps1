Write-Host "=====================================" -ForegroundColor Green
Write-Host "GameStatePlugin Build Script" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "CMakeLists.txt")) {
    Write-Host "Error: CMakeLists.txt not found." -ForegroundColor Red
    Write-Host "Please run this script from the plugin root directory."
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Step 1: Creating build directory..." -ForegroundColor Yellow
if (-not (Test-Path "build")) {
    New-Item -ItemType Directory -Path "build" | Out-Null
}

Write-Host ""
Write-Host "Step 2: Configuring with CMake..." -ForegroundColor Yellow
Set-Location build
try {
    # Clean build directory first
    Remove-Item -Path "CMakeCache.txt", "CMakeFiles" -Recurse -Force -ErrorAction SilentlyContinue

    # Try Visual Studio generator first
    Write-Host "Trying Visual Studio 17 2022..." -ForegroundColor Gray
    & "C:\Program Files\CMake\bin\cmake.exe" .. -G "Visual Studio 17 2022" -A x64
    if ($LASTEXITCODE -ne 0) {
        # Clean and try next generator
        Remove-Item -Path "CMakeCache.txt", "CMakeFiles" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Trying Visual Studio 16 2019..." -ForegroundColor Gray
        & "C:\Program Files\CMake\bin\cmake.exe" .. -G "Visual Studio 16 2019" -A x64
        if ($LASTEXITCODE -ne 0) {
            # Clean and try next generator
            Remove-Item -Path "CMakeCache.txt", "CMakeFiles" -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "Trying Visual Studio 15 2017..." -ForegroundColor Gray
            & "C:\Program Files\CMake\bin\cmake.exe" .. -G "Visual Studio 15 2017" -A x64
            if ($LASTEXITCODE -ne 0) {
                throw "All Visual Studio generators failed"
            }
        }
    }
} catch {
    Write-Host ""
    Write-Host "Error: CMake configuration failed." -ForegroundColor Red
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "- Visual Studio Build Tools with C++ workload are installed" -ForegroundColor Yellow
    Write-Host "- Bakkesmod SDK is available" -ForegroundColor Yellow
    Write-Host "- CMake is working (version $(& 'C:\Program Files\CMake\bin\cmake.exe' --version | Select-Object -First 1))" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 3: Building the plugin..." -ForegroundColor Yellow
try {
    & "C:\Program Files\CMake\bin\cmake.exe" --build . --config Release
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
} catch {
    Write-Host ""
    Write-Host "Error: Build failed." -ForegroundColor Red
    Write-Host "Please check the error messages above."
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "The plugin files are located in:" -ForegroundColor Cyan
Write-Host "build\GameStatePlugin.dll" -ForegroundColor White
Write-Host "GameStatePlugin.cfg" -ForegroundColor White
Write-Host ""
Write-Host "To install:" -ForegroundColor Cyan
Write-Host "1. Copy GameStatePlugin.dll to your Bakkesmod plugins folder" -ForegroundColor White
Write-Host "2. Copy GameStatePlugin.cfg to your Bakkesmod plugins folder" -ForegroundColor White
Write-Host ""
Write-Host "Your Bakkesmod plugins folder is typically:" -ForegroundColor Cyan
Write-Host "C:\Users\$env:USERNAME\AppData\Roaming\bakkesmod\bakkesmod\plugins\" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
