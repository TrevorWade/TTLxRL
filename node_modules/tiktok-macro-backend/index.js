// Loads environment variables from .env
require('dotenv').config();

const { WebSocketServer } = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');
const sender = require('node-key-sender');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const injectionMode = String(process.env.INJECTION_MODE || 'nodesender').toLowerCase();
let currentInjectionMode = injectionMode; // can be changed at runtime via WS
// Optional focus guard to avoid sending keys to the wrong window
const targetWindowKeyword = (process.env.TARGET_WINDOW_KEYWORD || '').toLowerCase();

// In-memory mapping: { [giftNameLower]: { key: 'a', durationMs: 500 } }
let giftToAction = {};
let isPaused = false;
// Track last execution time per gift (lowercased)
const lastFiredAtByGift = {};
// Track total likes count
let totalLikes = 0;

// 1) WebSocket server for frontend ↔ backend sync
const port = Number(process.env.WS_PORT || 5178);
const wss = new WebSocketServer({ port }, () => {
  console.log(`WS listening on ws://localhost:${port}`);
});

// Broadcast helper
function broadcast(payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(message);
  });
}

// Return { ok: boolean, title?: string, owner?: string }
async function checkTargetWindowFocused() {
  if (!targetWindowKeyword) return { ok: true };
  try {
    const mod = await import('active-win');
    const activeWindow = mod.default || mod;
    const info = await activeWindow();
    const title = String(info?.title || '');
    const owner = String(info?.owner?.name || '');
    const haystack = `${title} ${owner}`.toLowerCase();
    const ok = haystack.includes(targetWindowKeyword);
    return { ok, title, owner };
  } catch (err) {
    // If detection fails, don't block macros; just log once
    console.warn('Focus check failed; proceeding without guard');
    return { ok: true };
  }
}

// Handle messages from frontend (mapping updates, pause toggle, test events)
wss.on('connection', (ws) => {
  // Send current state to new client
  ws.send(JSON.stringify({ type: 'init', mapping: giftToAction, paused: isPaused, injectionMode: currentInjectionMode, totalLikes }));

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'update-mapping') {
        // Entire mapping replaces current one
        giftToAction = msg.mapping || {};
        broadcast({ type: 'mapping-updated', mapping: giftToAction });
      }

      if (msg.type === 'toggle-pause') {
        isPaused = !!msg.paused;
        broadcast({ type: 'pause-updated', paused: isPaused });
      }

      if (msg.type === 'test-gift') {
        // For Test Mode: simulate receiving a gift by name
        const giftName = String(msg.giftName || '').toLowerCase();
        const delayMs = Number(msg.delayMs || 0);
        if (delayMs > 0) {
          console.log(`[TEST] Simulate gift: ${giftName} in ${delayMs}ms`);
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          console.log(`[TEST] Simulate gift: ${giftName}`);
        }
        handleGiftByName(giftName, 'TestUser');
      }

      if (msg.type === 'set-injection-mode') {
        const mode = String(msg.mode || '').toLowerCase();
        const allowed = ['nodesender', 'nodesender_repeat', 'autohotkey'];
        if (allowed.includes(mode)) {
          currentInjectionMode = mode;
          broadcast({ type: 'injection-mode-updated', mode });
        }
      }

      if (msg.type === 'like-key') {
        // Handle like-triggered key press using same mechanism as gift mappings
        const key = String(msg.key || '').toLowerCase();
        const durationMs = Math.max(0, Number(msg.durationMs || 300));
        
        if (isPaused) {
          console.log('Paused; ignoring like key trigger');
          return;
        }

        // Focus guard
        const focus = await checkTargetWindowFocused();
        if (!focus.ok) {
          console.log('Target window not focused; skipping like key trigger');
          return;
        }

        try {
          console.log(`Like trigger: Press key "${key}" for ${durationMs}ms (mode=${currentInjectionMode})`);
          
          // Use exact same key injection logic as gifts
          if (currentInjectionMode === 'autohotkey') {
            const ahkPath = process.env.AHK_PATH || 'AutoHotkey.exe';
            const ahkKey = mapKeyToAhk(key);
            const titleMatch = targetWindowKeyword;

            const v2script = buildAhkHoldScriptV2(ahkKey, durationMs, titleMatch);
            const v1script = buildAhkHoldScriptV1(ahkKey, durationMs, titleMatch);

            const tmpV2 = path.join(os.tmpdir(), `ttlrl_like_${Date.now()}_${Math.random().toString(36).slice(2)}_v2.ahk`);
            fs.writeFileSync(tmpV2, v2script, 'utf8');
            const v2ok = await runAhk(ahkPath, tmpV2);
            try { fs.unlinkSync(tmpV2); } catch {}
            if (!v2ok) {
              const tmpV1 = path.join(os.tmpdir(), `ttlrl_like_${Date.now()}_${Math.random().toString(36).slice(2)}_v1.ahk`);
              fs.writeFileSync(tmpV1, v1script, 'utf8');
              await runAhk(ahkPath, tmpV1);
              try { fs.unlinkSync(tmpV1); } catch {}
            }
          } else {
            // Default to nodesender
            sender.startBatch();
            sender.batchTypeKey(key, 0, sender.BATCH_EVENT_KEY_DOWN);
            sender.batchTypeKey(key, durationMs, sender.BATCH_EVENT_KEY_UP);
            await sender.sendBatch();
          }
        } catch (err) {
          console.error('Like key trigger error:', err);
        }
      }
    } catch (e) {
      console.error('Invalid WS message', e);
    }
  });
});

// 2) TikTok Live connector
const username = process.env.TIKTOK_USERNAME;
if (!username) {
  console.error('TIKTOK_USERNAME not set in .env');
  process.exit(1);
}

const tiktok = new WebcastPushConnection(username, {
  enableExtendedGiftInfo: true,
});

// Gift event listener
tiktok.on('gift', (data) => {
  const giftName = (data?.giftName || '').toLowerCase();
  const senderName = data?.uniqueId || 'Unknown';
  const imageUrl =
    data?.giftPictureUrl || data?.giftImageUrl || (data?.gift && data.gift.pictureUrl) || null;
  const ts = Date.now();
  // Handle streak gifts: for streakable gifts (giftType===1), ignore interim events until repeatEnd
  const giftType = Number(data?.giftType);
  const repeatEnd = Boolean(data?.repeatEnd);
  if (giftType === 1 && repeatEnd === false) {
    // Streak in progress; wait for final event to avoid overcounting
    return;
  }
  const countInc = giftType === 1 ? Number(data?.repeatCount || 1) : 1;
  console.log(`Gift received: ${giftName} from ${senderName}`);
  broadcast({ type: 'gift', giftName, sender: senderName, imageUrl, ts, countInc });

  handleGiftByName(giftName, senderName);
});

// Like event listener for tracking total likes
tiktok.on('like', (data) => {
  const likeCount = Number(data?.likeCount || 1);
  totalLikes += likeCount;
  console.log(`Like received: +${likeCount} (total: ${totalLikes})`);
  broadcast({ type: 'like', likeCount, totalLikes });
});

tiktok.on('connected', () => {
  console.log(`Connected to TikTok Live as viewer of @${username}`);
});

tiktok.on('disconnected', () => {
  console.log('Disconnected from TikTok');
});

tiktok.on('streamEnd', () => {
  console.log('Stream ended');
});

// Connect
tiktok.connect().catch((err) => {
  console.error('Failed to connect to TikTok:', err);
});

// 3) Macro engine
async function handleGiftByName(giftNameLower, senderName) {
  if (isPaused) {
    console.log('Paused; ignoring gift');
    return;
  }
  const action = giftToAction[giftNameLower];
  if (!action) {
    console.log(`No action mapped for gift: ${giftNameLower}`);
    return;
  }

  // Cooldown check (per gift). If cooldownMs is set, ignore gifts arriving sooner than that.
  const cooldownMs = Number(action.cooldownMs || 0);
  if (cooldownMs > 0) {
    const now = Date.now();
    const last = Number(lastFiredAtByGift[giftNameLower] || 0);
    if (now - last < cooldownMs) {
      const waitMs = cooldownMs - (now - last);
      console.log(`Cooldown active for "${giftNameLower}"; ${waitMs}ms remaining`);
      return;
    }
  }

  // Focus guard
  const focus = await checkTargetWindowFocused();
  if (!focus.ok) {
    console.log('Target window not focused; skipping macro');
    broadcast({ type: 'focus-warning', expected: targetWindowKeyword, activeTitle: focus.title, activeOwner: focus.owner });
    return;
  }

  // Sequence support
  if (action && String(action.type || '').toLowerCase() === 'sequence' && Array.isArray(action.steps)) {
    try {
      console.log(`Execute sequence for gift "${giftNameLower}" (mode=${currentInjectionMode}) (from ${senderName})`);
      if (currentInjectionMode === 'autohotkey') {
        await runAhkSequence(action.steps);
      } else {
        await runNodesenderSequence(action.steps);
      }
      lastFiredAtByGift[giftNameLower] = Date.now();
    } catch (err) {
      console.error('Sequence error:', err);
    }
    return;
  }

  const key = String(action.key || '').toLowerCase();
  // Support new durationSec while remaining backward compatible with durationMs
  const durationMs = action.durationSec != null ? Math.max(0, Number(action.durationSec) * 1000) : Number(action.durationMs || 300);

  try {
    console.log(`Press key "${key}" for ${durationMs}ms (mode=${currentInjectionMode}) (from ${senderName})`);
    if (currentInjectionMode === 'nutjs') {
      const { keyboard, Key, sleep } = require('@nut-tree/nut-js');
      const map = {
        'enter': Key.Enter,
        'space': Key.Space,
        'w': Key.W,
        'a': Key.A,
        's': Key.S,
        'd': Key.D,
        'up': Key.Up,
        'down': Key.Down,
        'left': Key.Left,
        'right': Key.Right,
      };
      const mapped = map[key];
      if (!mapped) {
        console.warn(`nutjs: unsupported key "${key}"; falling back to node-key-sender`);
      } else {
        await keyboard.pressKey(mapped);
        await sleep(durationMs);
        await keyboard.releaseKey(mapped);
        lastFiredAtByGift[giftNameLower] = Date.now();
        return;
      }
    }

    if (currentInjectionMode === 'autohotkey') {
      const ahkPath = process.env.AHK_PATH || 'AutoHotkey.exe';
      const ahkKey = mapKeyToAhk(key);
      const titleMatch = targetWindowKeyword;

      // Try v2 script first; if it fails, fall back to v1
      const v2script = buildAhkHoldScriptV2(ahkKey, durationMs, titleMatch);
      const v1script = buildAhkHoldScriptV1(ahkKey, durationMs, titleMatch);

      const tmpV2 = path.join(os.tmpdir(), `ttlrl_${Date.now()}_${Math.random().toString(36).slice(2)}_v2.ahk`);
      fs.writeFileSync(tmpV2, v2script, 'utf8');
      const v2ok = await runAhk(ahkPath, tmpV2);
      try { fs.unlinkSync(tmpV2); } catch {}
      if (!v2ok) {
        const tmpV1 = path.join(os.tmpdir(), `ttlrl_${Date.now()}_${Math.random().toString(36).slice(2)}_v1.ahk`);
        fs.writeFileSync(tmpV1, v1script, 'utf8');
        await runAhk(ahkPath, tmpV1);
        try { fs.unlinkSync(tmpV1); } catch {}
      }
      lastFiredAtByGift[giftNameLower] = Date.now();
      return;
    }

    if (currentInjectionMode === 'nodesender_repeat' || String(action.pressMode || '').toLowerCase() === 'repeat') {
      // Build one big batch of rapid key taps spaced by intervalMs
      const intervalMs = Math.max(5, Number(process.env.REPEAT_INTERVAL_MS || action.repeatIntervalMs || 20));
      const taps = Math.max(1, Math.floor(durationMs / intervalMs));
      sender.startBatch();
      for (let i = 0; i < taps; i++) {
        const wait = i === 0 ? 0 : intervalMs;
        sender.batchTypeKey(key, wait, sender.BATCH_EVENT_KEY_PRESS);
      }
      // Safety key up at end
      sender.batchTypeKey(key, 0, sender.BATCH_EVENT_KEY_UP);
      await sender.sendBatch();
      lastFiredAtByGift[giftNameLower] = Date.now();
      return;
    }

    // nodesender hold (default)
    sender.startBatch();
    sender.batchTypeKey(key, 0, sender.BATCH_EVENT_KEY_DOWN);
    sender.batchTypeKey(key, durationMs, sender.BATCH_EVENT_KEY_UP);
    await sender.sendBatch();
    lastFiredAtByGift[giftNameLower] = Date.now();
  } catch (err) {
    console.error('Key press error:', err);
  }
}

function mapKeyToAhk(key) {
  const simple = {
    'enter': 'Enter',
    'space': 'Space',
    'w': 'w', 'a': 'a', 's': 's', 'd': 'd',
    'up': 'Up', 'down': 'Down', 'left': 'Left', 'right': 'Right',
  };
  return simple[key] || key;
}

function buildAhkHoldScriptV1(ahkKey, durationMs, titleKeyword) {
  const lines = [];
  lines.push('SetTitleMatchMode, 2');
  lines.push('SendMode, Input');
  lines.push('SetKeyDelay, -1, -1');
  if (titleKeyword) {
    lines.push(`title := "${titleKeyword}"`);
    lines.push('IfWinExist, %title%');
    lines.push('{');
    lines.push('  WinActivate, %title%');
    lines.push('  WinWaitActive, %title%,,1');
    lines.push('}');
  }
  lines.push(`Send, {${ahkKey} down}`);
  lines.push(`Sleep, ${Math.max(0, Math.floor(durationMs))}`);
  lines.push(`Send, {${ahkKey} up}`);
  lines.push('ExitApp');
  return lines.join('\n');
}

function buildAhkHoldScriptV2(ahkKey, durationMs, titleKeyword) {
  const lines = [];
  lines.push('#SingleInstance Force');
  lines.push('SendMode "Input"');
  lines.push('SetKeyDelay -1, -1');
  if (titleKeyword) {
    lines.push(`title := "${titleKeyword}"`);
    lines.push('h := WinExist(title)');
    lines.push('if (h) {');
    lines.push('  WinActivate "ahk_id " h');
    lines.push('  WinWaitActive "ahk_id " h,,1');
    lines.push('}');
  }
  lines.push(`Send "{${ahkKey} down}"`);
  lines.push(`Sleep ${Math.max(0, Math.floor(durationMs))}`);
  lines.push(`Send "{${ahkKey} up}"`);
  lines.push('ExitApp');
  return lines.join('\n');
}

function runAhk(ahkPath, scriptPath) {
  return new Promise((resolve) => {
    const p = spawn(ahkPath, [scriptPath]);
    let resolved = false;
    p.on('exit', (code) => { if (!resolved) { resolved = true; resolve(code === 0); } });
    p.on('error', () => { if (!resolved) { resolved = true; resolve(false); } });
  });
}

async function runAhkSequence(steps) {
  // Build a minimal AHK v2 script first
  const titleKeyword = targetWindowKeyword;
  const lines = [];
  lines.push('#SingleInstance Force');
  lines.push('SendMode "Input"');
  lines.push('SetKeyDelay -1, -1');
  if (titleKeyword) {
    lines.push(`title := "${titleKeyword}"`);
    lines.push('h := WinExist(title)');
    lines.push('if (h) {' );
    lines.push('  WinActivate "ahk_id " h');
    lines.push('  WinWaitActive "ahk_id " h,,1');
    lines.push('}');
  }
  for (const s of steps) {
    const delay = Math.max(0, Number(s.delayMs || 0));
    if (s.kind === 'keyTap') {
      lines.push(`Sleep ${delay}`);
      lines.push(`Send "{${mapKeyToAhk(String(s.key || '').toLowerCase())}}"`);
    } else if (s.kind === 'keyDown') {
      lines.push(`Sleep ${delay}`);
      lines.push(`Send "{${mapKeyToAhk(String(s.key || '').toLowerCase())} down}"`);
    } else if (s.kind === 'keyUp') {
      lines.push(`Sleep ${delay}`);
      lines.push(`Send "{${mapKeyToAhk(String(s.key || '').toLowerCase())} up}"`);
    } else if (s.kind === 'text') {
      lines.push(`Sleep ${delay}`);
      // Escape quotes in text
      const text = String(s.text || '').replace(/"/g, '""');
      lines.push(`Send "${text}"`);
    } else if (s.kind === 'wait') {
      lines.push(`Sleep ${delay}`);
    } else if (s.kind === 'combo' && Array.isArray(s.keys)) {
      lines.push(`Sleep ${delay}`);
      const combo = s.keys.map((k) => mapKeyToAhk(String(k || '').toLowerCase())).join(' & ');
      // AHK combo send as down then up in order
      for (const k of s.keys) lines.push(`Send "{${mapKeyToAhk(String(k || '').toLowerCase())} down}"`);
      for (let i = s.keys.length - 1; i >= 0; i--) lines.push(`Send "{${mapKeyToAhk(String(s.keys[i] || '').toLowerCase())} up}"`);
    }
  }
  lines.push('ExitApp');

  const ahkPath = process.env.AHK_PATH || 'AutoHotkey.exe';
  const v2 = lines.join('\n');
  const tmp = path.join(os.tmpdir(), `ttlrl_seq_${Date.now()}_${Math.random().toString(36).slice(2)}_v2.ahk`);
  fs.writeFileSync(tmp, v2, 'utf8');
  const ok = await runAhk(ahkPath, tmp);
  try { fs.unlinkSync(tmp); } catch {}
  if (ok) return;

  // Fallback to v1
  const v1 = v2
    .replaceAll('SendMode "Input"', 'SendMode, Input')
    .replaceAll('SetKeyDelay -1, -1', 'SetKeyDelay, -1, -1')
    .replaceAll('Sleep ', 'Sleep, ')
    .replaceAll('Send "', 'Send, "');
  const tmp1 = path.join(os.tmpdir(), `ttlrl_seq_${Date.now()}_${Math.random().toString(36).slice(2)}_v1.ahk`);
  fs.writeFileSync(tmp1, v1, 'utf8');
  await runAhk(ahkPath, tmp1);
  try { fs.unlinkSync(tmp1); } catch {}
}

async function runNodesenderSequence(steps) {
  sender.startBatch();
  for (const s of steps) {
    const delay = Math.max(0, Number(s.delayMs || 0));
    if (s.kind === 'keyTap') {
      sender.batchTypeKey(String(s.key || '').toLowerCase(), delay, sender.BATCH_EVENT_KEY_PRESS);
    } else if (s.kind === 'keyDown') {
      sender.batchTypeKey(String(s.key || '').toLowerCase(), delay, sender.BATCH_EVENT_KEY_DOWN);
    } else if (s.kind === 'keyUp') {
      sender.batchTypeKey(String(s.key || '').toLowerCase(), delay, sender.BATCH_EVENT_KEY_UP);
    } else if (s.kind === 'text') {
      // Split batch: send accumulated, then send text, then restart batch
      await sender.sendBatch();
      await sender.sendText(String(s.text || ''));
      sender.startBatch();
    } else if (s.kind === 'wait') {
      // Represent as a no-op press on a benign key with wait only
      sender.batchTypeKey('enter', delay, sender.BATCH_EVENT_KEY_PRESS);
    } else if (s.kind === 'combo' && Array.isArray(s.keys)) {
      // Fallback: down then up in reverse
      for (let i = 0; i < s.keys.length; i++) sender.batchTypeKey(String(s.keys[i] || '').toLowerCase(), i === 0 ? delay : 0, sender.BATCH_EVENT_KEY_DOWN);
      for (let i = s.keys.length - 1; i >= 0; i--) sender.batchTypeKey(String(s.keys[i] || '').toLowerCase(), 0, sender.BATCH_EVENT_KEY_UP);
    }
  }
  await sender.sendBatch();
}


