@echo off
setlocal enabledelayedexpansion
REM Ensure a persistent console window (prevents quick-close on double-click)
if "%PERSISTENT_SHELL%"=="1" goto :persisted_console
start "TTL_RL Launcher" cmd /k "set PERSISTENT_SHELL=1 & call ""%~f0"""
exit /b

:persisted_console
if "%DEBUG%"=="1" pause
REM ============================================
REM  TikTok Live → Key Mapper starter script
REM  Opens two terminal windows:
REM    • FRONTEND  (Vite)          — http://localhost:5173
REM    • BACKEND   (WebSocket API) — ws://localhost:5178
REM ============================================

echo Starting TTLxRL application...
echo Current directory: %CD%
echo Script path: %~dp0
echo.

REM Add error handling to prevent script from closing unexpectedly
set "ERROR_COUNT=0"
set "FIRST_RUN=0"

REM Test basic functionality
echo Testing basic script functionality...
echo This is a test message to verify the script is running.
echo.

REM ---- Detect first run (any missing dependencies or config) ----
IF NOT EXIST node_modules set "FIRST_RUN=1"
IF NOT EXIST frontend\node_modules set "FIRST_RUN=1"
IF NOT EXIST backend\node_modules set "FIRST_RUN=1"
IF NOT EXIST frontend\electron\node_modules set "FIRST_RUN=1"
IF NOT EXIST backend\.env set "FIRST_RUN=1"
if "%FIRST_RUN%"=="1" (
  echo First-time setup detected. Installing any missing dependencies...
  echo.
) else (
  echo Dependencies appear installed. Skipping install steps quickly.
  echo.
)

REM ---- Prerequisites check ----
echo Checking for npm...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: "npm" was not found in PATH. Please install Node.js 18+ and try again.
  echo.
  set /a ERROR_COUNT+=1
  echo Press any key to continue anyway...
  pause >nul
) else (
  echo npm found successfully.
  echo Testing npm version...
  npm --version 2>nul
  if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Could not get npm version, but npm appears to be installed.
    echo Continuing anyway...
  ) else (
    echo npm is working correctly.
  )
)

REM ---- Install dependencies (runs only if node_modules missing) ----
echo Checking root dependencies...
IF NOT EXIST node_modules (
  echo Installing root dependencies...
  npm install --silent
  if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to install root dependencies
    echo Continuing anyway - dependencies might already be available...
    set /a ERROR_COUNT+=1
  ) else (
    echo Root dependencies installed successfully.
  )
) else (
  echo Root dependencies already installed.
)

REM ---- Install frontend dependencies ----
echo Checking frontend dependencies...
IF NOT EXIST frontend\node_modules (
  echo Installing frontend dependencies...
  cd /d "%~dp0frontend"
  npm install --silent
  if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to install frontend dependencies
    echo Continuing anyway - dependencies might already be available...
    set /a ERROR_COUNT+=1
  ) else (
    echo Frontend dependencies installed successfully.
  )
  cd /d "%~dp0"
) else (
  echo Frontend dependencies already installed.
)

REM ---- Install backend dependencies ----
echo Checking backend dependencies...
IF NOT EXIST backend\node_modules (
  echo Installing backend dependencies...
  cd /d "%~dp0backend"
  npm install --silent
  if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to install backend dependencies
    echo Continuing anyway - dependencies might already be available...
    set /a ERROR_COUNT+=1
  ) else (
    echo Backend dependencies installed successfully.
  )
  cd /d "%~dp0"
) else (
  echo Backend dependencies already installed.
)

REM ---- Install electron dependencies ----
echo Checking electron dependencies...
IF NOT EXIST frontend\electron\node_modules (
  echo Installing electron dependencies...
  cd /d "%~dp0frontend\electron"
  npm install --silent
  if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to install electron dependencies
    echo Continuing anyway - dependencies might already be available...
    set /a ERROR_COUNT+=1
  ) else (
    echo Electron dependencies installed successfully.
  )
  cd /d "%~dp0"
) else (
  echo Electron dependencies already installed.
)

REM ---- Create backend\.env with sensible defaults if missing ----
echo Checking for backend\.env file...
IF NOT EXIST backend\.env (
  echo Creating backend\.env with default values. You can edit it later.
  (
    echo TIKTOK_USERNAME=
    echo WS_PORT=5178
    echo TARGET_WINDOW_KEYWORD=rocket league
    echo INJECTION_MODE=autohotkey
    echo AHK_PATH="C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe"
  ) > backend\.env
  if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to create backend\.env file
    set /a ERROR_COUNT+=1
  ) else (
    echo backend\.env created successfully.
  )
) else (
  echo backend\.env already exists.
)

REM ---- Start frontend in the same window (background) ----
echo Starting frontend server...
start /b "TTL_RL Frontend" cmd /c "pushd \"%~dp0frontend\" & npm run dev"
if %ERRORLEVEL% NEQ 0 (
  echo WARNING: Failed to start frontend server
  echo Continuing anyway...
  set /a ERROR_COUNT+=1
)

REM ---- Start backend in the same window (background) ----
echo Starting backend server...
start /b "TTL_RL Backend" cmd /c "pushd \"%~dp0backend\" & npm start"
if %ERRORLEVEL% NEQ 0 (
  echo WARNING: Failed to start backend server
  echo Continuing anyway...
  set /a ERROR_COUNT+=1
)

REM ---- Wait for servers to start listening, then launch Electron app ----
echo Waiting for servers to start...
echo - Waiting for frontend (port 5173) to listen...
call :wait_for_port 5173 20
echo - Waiting for backend (port 5178) to listen...
call :wait_for_port 5178 20
if "%FIRST_RUN%"=="1" echo One-time setup completed. Launching the app...

echo Launching Electron app...
start "TTL_RL Electron App" cmd /c "pushd \"%~dp0frontend\electron\" & npm start"
if %ERRORLEVEL% NEQ 0 (
  echo WARNING: Failed to launch Electron app
  echo Continuing anyway...
  set /a ERROR_COUNT+=1
)

REM ---- Check if Electron launched successfully ----
echo Checking if Electron app launched...
timeout /t 2 /nobreak >nul
tasklist /FI "WINDOWTITLE eq TTL_RL Electron App*" 2>nul | find /I "electron.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: Electron app launched successfully!
) else (
    echo WARNING: Electron app may not have launched properly.
    echo Check the Electron window for any error messages.
    echo The app might still be starting up...
)

echo.
echo ============================================
echo  APPLICATION STATUS                          
echo  FRONTEND : http://localhost:5173           
echo  BACKEND  : ws://localhost:5178            
echo  Electron app should be launching...
echo  Close this window to stop all services.               
echo ============================================
echo.
if %ERROR_COUNT% GTR 0 (
  echo Script completed with %ERROR_COUNT% warnings/errors.
  echo Check the messages above for details.
) else (
  echo Script completed successfully!
)
echo.
echo Press any key to close this window and stop all services...
pause >nul

goto :eof

REM ---- Helpers ----
:wait_for_port
REM Wait for a TCP port to be in LISTENING state
REM Usage: call :wait_for_port PORT MAX_WAIT_SECONDS
setlocal
set "TARGET_PORT=%~1"
set "MAX_SECS=%~2"
if "%MAX_SECS%"=="" set "MAX_SECS=15"
set /a "ELAPSED=0"
:_wait_loop
rem We search for a line that includes :PORT and LISTENING
netstat -ano | findstr /R /C:":%TARGET_PORT% .*LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
  endlocal & goto :eof
)
timeout /t 1 /nobreak >nul
set /a ELAPSED+=1
if %ELAPSED% GEQ %MAX_SECS% (
  echo WARNING: Port %TARGET_PORT% did not start listening within %MAX_SECS% seconds.
  endlocal & goto :eof
)
goto :_wait_loop
