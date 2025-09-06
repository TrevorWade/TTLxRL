@echo off
REM ============================================
REM  TikTok Live → Key Mapper starter script
REM  Opens two terminal windows:
REM    • FRONTEND  (Vite)          — http://localhost:5173
REM    • BACKEND   (WebSocket API) — ws://localhost:5178
REM ============================================

REM ---- Prerequisites check ----
where npm >nul 2>nul || (
  echo "npm" was not found in PATH. Please install Node.js 18+ and try again.
  pause
  exit /b 1
)

REM ---- Install dependencies (runs only if node_modules missing) ----
IF NOT EXIST node_modules (
  echo Installing root dependencies...
  npm install --silent
)

REM ---- Create backend\.env with sensible defaults if missing ----
IF NOT EXIST backend\.env (
  echo Creating backend\.env with default values. You can edit it later.
  (
    echo TIKTOK_USERNAME=
    echo WS_PORT=5178
    echo TARGET_WINDOW_KEYWORD=rocket league
    echo INJECTION_MODE=autohotkey
    echo AHK_PATH="C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe"
  ) > backend\.env
)

REM ---- Start frontend in the same window (background) ----
start /b "TTL_RL Frontend" cmd /c "cd /d %~dp0frontend & npm run dev"

REM ---- Start backend in the same window (background) ----
start /b "TTL_RL Backend" cmd /c "cd /d %~dp0backend & npm start"

REM ---- Wait a moment for servers to start, then open browser ----
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ============================================
echo  Both servers starting...                  
echo  FRONTEND : http://localhost:5173           
echo  BACKEND  : ws://localhost:5178            
echo  Close this window to stop them.               
echo ============================================
echo.
pause
