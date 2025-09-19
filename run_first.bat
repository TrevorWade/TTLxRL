@echo off
setlocal enabledelayedexpansion

echo TTLxRL first-time setup starting...
echo Current directory: %CD%
echo Script path: %~dp0
echo.

set "ERROR_COUNT=0"

REM --- Ensure we are at repo root ---
pushd "%~dp0" >nul 2>nul

REM --- Check Node.js/npm presence ---
echo Checking for Node.js and npm...
where node >nul 2>nul
if not %ERRORLEVEL%==0 (
  echo Node.js not found in PATH.
  echo Attempting to install via winget or choco...
  where winget >nul 2>nul
  if %ERRORLEVEL%==0 (
    echo Installing Node.js LTS using winget (non-interactive)...
    winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
  ) else (
    where choco >nul 2>nul
    if %ERRORLEVEL%==0 (
      echo Installing Node.js LTS using Chocolatey (non-interactive)...
      choco install nodejs-lts -y
    ) else (
      echo ERROR: Neither winget nor choco found. Please install Node.js 18+ from https://nodejs.org and re-run this script.
      set /a ERROR_COUNT+=1
      goto :after_node
    )
  )
  echo Verifying Node.js installation...
  where node >nul 2>nul
  if not %ERRORLEVEL%==0 (
    echo ERROR: Node.js still not found after attempted install.
    set /a ERROR_COUNT+=1
  )
)

:after_node
where npm >nul 2>nul
if not %ERRORLEVEL%==0 (
  echo ERROR: npm not found even after Node.js installation attempt.
  set /a ERROR_COUNT+=1
)
echo.

REM --- Install root dependencies ---
echo Installing root dependencies...
if not exist node_modules (
  call npm install --silent
  if not %ERRORLEVEL%==0 (
    echo WARNING: Failed to install root dependencies
    set /a ERROR_COUNT+=1
  )
) else (
  echo Root dependencies already present.
)
echo.

REM --- Install frontend dependencies ---
echo Installing frontend dependencies...
pushd "%~dp0frontend" >nul
if not exist node_modules (
  call npm install --silent
  if not %ERRORLEVEL%==0 (
    echo WARNING: Failed to install frontend dependencies
    set /a ERROR_COUNT+=1
  )
) else (
  echo Frontend dependencies already present.
)
popd >nul
echo.

REM --- Install backend dependencies ---
echo Installing backend dependencies...
pushd "%~dp0backend" >nul
if not exist node_modules (
  call npm install --silent
  if not %ERRORLEVEL%==0 (
    echo WARNING: Failed to install backend dependencies
    set /a ERROR_COUNT+=1
  )
) else (
  echo Backend dependencies already present.
)
popd >nul
echo.

REM --- Install electron dependencies ---
echo Installing electron dependencies...
pushd "%~dp0frontend\electron" >nul
if not exist node_modules (
  call npm install --silent
  if not %ERRORLEVEL%==0 (
    echo WARNING: Failed to install electron dependencies
    set /a ERROR_COUNT+=1
  )
) else (
  echo Electron dependencies already present.
)
popd >nul
echo.

REM --- Create backend .env if missing ---
if not exist backend\.env (
  echo Creating backend\.env with defaults...
  (
    echo TIKTOK_USERNAME=
    echo WS_PORT=5178
    echo TARGET_WINDOW_KEYWORD=rocket league
    echo INJECTION_MODE=autohotkey
    echo AHK_PATH="C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe"
  ) > backend\.env
  if not %ERRORLEVEL%==0 (
    echo WARNING: Failed to create backend\.env
    set /a ERROR_COUNT+=1
  )
) else (
  echo backend\.env already exists, skipping.
)
echo.

if %ERROR_COUNT% GTR 0 (
  echo Setup completed with %ERROR_COUNT% warnings/errors. You can try running start_ttlrl.bat.
) else (
  echo Setup completed successfully.
)
echo.
echo Press any key to close setup...
pause >nul
exit /b


