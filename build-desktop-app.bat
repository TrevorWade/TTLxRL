@echo off
REM ============================================
REM  TikTok Live → Rocket League Desktop App Builder
REM  This creates a clickable .exe installer
REM ============================================

echo Building TikTok Gift Key Mapper Desktop App...
echo.

REM ---- Prerequisites check ----
where npm >nul 2>nul || (
  echo "npm" was not found in PATH. Please install Node.js 18+ and try again.
  pause
  exit /b 1
)

REM ---- Go to frontend directory ----
cd /d %~dp0frontend

REM ---- Install dependencies if needed ----
IF NOT EXIST node_modules (
  echo Installing frontend dependencies...
  npm install --silent
)

REM ---- Ensure Electron is installed locally (some envs cache node_modules without it) ----
where node >nul 2>nul
FOR /f "tokens=*" %%i IN ('npm ls electron --depth=0 2^>nul ^| findstr /R /C:"electron@"') DO set HAVE_ELECTRON=1
IF NOT DEFINED HAVE_ELECTRON (
  echo Electron not detected locally. Installing pinned version...
  npm install electron@37.3.1 --save-dev --silent
)
set HAVE_ELECTRON=

REM ---- Stop any running Electron/app instances to avoid file lock issues ----
taskkill /F /IM "TikTok Gift Key Mapper.exe" >nul 2>nul
taskkill /F /IM "electron.exe" >nul 2>nul
timeout /t 2 >nul

REM ---- Prefer building to a fresh output directory to avoid locked files ----
set OUTPUT_DIR=dist-electron-fresh
IF EXIST "%OUTPUT_DIR%" (
  rmdir /S /Q "%OUTPUT_DIR%" >nul 2>nul
)

REM ---- Build renderer bundle ----
echo Building desktop application...
npm run build
IF NOT %ERRORLEVEL% EQU 0 (
  echo Build step failed.
  goto build_failed
)

REM ---- Package with electron-builder to a fresh output directory ----
npx electron-builder -c.directories.output=%OUTPUT_DIR%
IF %ERRORLEVEL% EQU 0 (
  echo.
  echo ============================================
  echo  SUCCESS! Desktop app built successfully!
  echo  Check the 'frontend\%OUTPUT_DIR%' folder
  echo  for the installer (.exe file)
  echo ============================================
  goto end
)

:build_failed
echo.
echo ============================================
echo  BUILD FAILED!
echo  Check the error messages above
echo ============================================

:end
echo.
pause

