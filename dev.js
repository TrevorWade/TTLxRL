// Simple concurrent dev runner for Windows & cross-platform
// Spawns frontend (Vite) and backend (Node) in parallel with prefixed logs
// Rationale: avoid relying on npm-run-all and any install issues/locks

const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';

const COLORS = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(name) {
  // Deterministic color per name
  const map = { backend: COLORS.cyan, frontend: COLORS.green };
  return map[name] || COLORS.blue;
}

function start(name, cmd, args, cwdDir) {
  // Use a shell on Windows so .cmd batch shims like npm work reliably
  const child = spawn(cmd, args, {
    shell: isWin,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: cwdDir || process.cwd()
  });

  const tag = `${colorize(name)}[${name}]${COLORS.reset}`;

  child.stdout.on('data', (data) => {
    process.stdout.write(`${tag} ${data}`);
  });
  child.stderr.on('data', (data) => {
    process.stderr.write(`${tag} ${data}`);
  });

  child.on('exit', (code, signal) => {
    const why = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`${tag} exited with ${why}`);
  });

  return child;
}

console.log(`${COLORS.gray}Starting frontend and Electron...${COLORS.reset}`);

const procs = [];

// Frontend (Vite) - run in subdirectory to avoid workspace flags on Windows
procs.push(start('frontend', 'npm', ['run', 'dev'], path.join(__dirname, 'frontend')));

// Electron shell (loads http://localhost:5173 and starts backend internally)
// Important: We no longer spawn the backend here to avoid port conflicts.
procs.push(start('electron', 'npm', ['run', 'dev'], path.join(__dirname, 'frontend', 'electron')));

function shutdown() {
  console.log(`${COLORS.gray}Shutting down child processes...${COLORS.reset}`);
  for (const p of procs) {
    try { p.kill(); } catch (_) {}
  }
  // Give children a moment to exit cleanly
  setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', shutdown);
// Ignore SIGTERM to prevent premature shutdown from parent/npm on Windows
// Some environments send SIGTERM right after spawn; we keep dev servers alive
// and rely on Ctrl+C (SIGINT) to stop them during development.
// process.on('SIGTERM', shutdown);

// Keep the event loop alive defensively (child streams should already do this)
setInterval(() => {}, 60 * 1000);


