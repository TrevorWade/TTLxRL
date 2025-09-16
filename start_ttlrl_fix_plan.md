### TTLxRL start_ttlrl.bat quick-close issue — Fix Plan

This plan explains why the window may flash and close, how to capture useful logs, and the minimal script changes to make the launcher reliable. It uses simple steps and small, focused edits.

### Why this happens (likely causes)
- **Double-click hides errors**: When a `.bat` is double-clicked, the window closes on errors you cannot see.
- **Unquoted paths**: The script `cd /d %~dp0frontend` lines are not quoted. If your folder path contains spaces (common on Desktop), `cd` fails silently and later steps break.
- **Environment/Path issues**: Missing Node/npm or blocked execution can abort early.

Your log shows the repo is in `C:\Users\trevo\Desktop\New folder (2)\TTLxRL` — the space in `New folder (2)` makes quoting essential. The edits below address exactly this.

### What to do first (no code changes)
1) Run from a persistent console to see errors
   - Open Windows PowerShell.
   - Navigate to the repo folder, then run the script:
     - Example:
       - `cd "C:\Users\<you>\Desktop\TTLxRL" ; .\start_ttlrl.bat`
   - Note: Run `start_ttlrl.bat` (no leading `@`).

2) Capture logs for review
   - From PowerShell in the repo folder:
     - `./start_ttlrl.bat *> start_log.txt`
   - Open `start_log.txt` and look for the first error message.

3) Verify prerequisites
   - `node -v ; npm -v`
   - Ensure Node.js 18+ is installed and available in PATH.

### Minimal script edits (recommended)
These are small, safe edits that improve reliability without changing behavior.

1) Quote folder paths on all `cd` lines
   - Replace each of the following patterns in `start_ttlrl.bat`:
     - `cd /d %~dp0frontend` → `cd /d "%~dp0frontend"`
     - `cd /d %~dp0backend` → `cd /d "%~dp0backend"`
     - `cd /d %~dp0frontend\electron` → `cd /d "%~dp0frontend\electron"`
     - `cd /d %~dp0` → `cd /d "%~dp0"`
   - Rationale: Handles spaces in directory names.

2) Add an early debug pause toggle (optional but helpful)
   - Near the top (after `setlocal enabledelayedexpansion`), add:
     - `if "%DEBUG%"=="1" pause`
   - Run with `DEBUG=1` to pause early and read any first errors.

3) Consider opening child processes in separate windows during debugging
   - Temporarily remove `/b` from the `start` lines so each service opens its own window. Avoid `&&` by using `pushd`:
     - `start "TTL_RL Frontend" cmd /c "pushd \"%~dp0frontend\" & npm run dev"`
     - `start "TTL_RL Backend" cmd /c "pushd \"%~dp0backend\" & npm start"`
   - After confirming, you can restore `/b`.

### How to test after edits
1) Run from PowerShell so the console persists:
   - `cd "C:\Users\<you>\Desktop\TTLxRL" ; .\start_ttlrl.bat`
2) Confirm:
   - Frontend: http://localhost:5173
   - Backend: ws://localhost:5178
   - Electron window launches (or check its console output).
3) If something fails, re-run and capture logs:
   - `./start_ttlrl.bat *> start_log.txt`

### If it still closes instantly
- Post the contents of `start_log.txt` (first error lines) or run with `DEBUG=1` and note where it stops.
- If `npm` is not found, install Node.js 18+ and reopen the terminal.

### About .gitignore
- This file is named `start_ttlrl_fix_plan.md` so it matches existing ignore rules (`*_plan.md`, `*plan*.md`). It will not be committed.

