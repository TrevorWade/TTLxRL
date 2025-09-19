@echo off
setlocal enabledelayedexpansion
REM Ensure a persistent console window (prevents quick-close on double-click)
if "%PERSISTENT_SHELL%"=="1" goto :persisted_console
start "TTL_RL Launcher" cmd /k "set PERSISTENT_SHELL=1 ^& call \"%~f0\""
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

REM ---- Quick dependency presence check ----
IF NOT EXIST node_modules goto :missing_deps
IF NOT EXIST frontend\node_modules goto :missing_deps
IF NOT EXIST backend\node_modules goto :missing_deps
IF NOT EXIST frontend\electron\node_modules goto :missing_deps
IF NOT EXIST backend\.env (
  echo WARNING: backend\.env is missing. Please run run_first.bat.
  goto :missing_deps
)
echo Dependencies detected. Starting services...
echo.

REM ---- Start frontend in the same window (background) ----
echo Starting frontend server...
start /b "TTL_RL Frontend" cmd /c "pushd \"%~dp0frontend\" ^& npm run dev"
if %ERRORLEVEL% NEQ 0 (
  echo WARNING: Failed to start frontend server
  echo Continuing anyway...
  set /a ERROR_COUNT+=1
)

REM ---- Start backend in the same window (background) ----
echo Starting backend server...
start /b "TTL_RL Backend" cmd /c "pushd \"%~dp0backend\" ^& npm start"
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
start "TTL_RL Electron App" cmd /c "pushd \"%~dp0frontend\electron\" ^& npm start"
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

REM ---- Missing dependency handler ----
:missing_deps
echo.
echo One or more dependencies are missing.
echo Please run run_first.bat in this folder to install prerequisites.
echo.
echo Press any key to exit...
pause >nul
exit /b 1

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
