// Loads environment variables from .env
require('dotenv').config();

const { WebSocketServer } = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');
const sender = require('node-key-sender');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const url = require('url');
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

// Cache for TikTok gift catalog
let giftCatalogCache = null;
let catalogCacheTimestamp = 0;

// Dynamic gift catalog collected from live events
let dynamicGiftCatalog = new Map(); // giftName -> { id, name, imageUrl, diamondCount, lastSeen }

// 1) WebSocket server for frontend ↔ backend sync
const port = Number(process.env.WS_PORT || 5178);
const wss = new WebSocketServer({ port }, () => {
  console.log(`WS listening on ws://localhost:${port}`);
});

// Broadcast helper
function broadcast(payload) {
  const message = JSON.stringify(payload);
  const clientCount = wss.clients.size;
  console.log(`📡 Broadcasting to ${clientCount} clients:`, payload.type);
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
      console.log(`✅ Sent to client ${client._id || 'unknown'}`);
    } else {
      console.log(`❌ Client ${client._id || 'unknown'} not ready (state: ${client.readyState})`);
    }
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
  console.log('🔌 New WebSocket client connected');
  
  // Send current state to new client
  ws.send(JSON.stringify({ 
    type: 'init', 
    mapping: giftToAction, 
    paused: isPaused, 
    injectionMode: currentInjectionMode, 
    totalLikes,
    connectionStatus,
    username,
    connectionError,
    isLive
  }));

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      console.log(`📨 Received WebSocket message: ${msg.type}`);
      
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

      if (msg.type === 'test-like-trigger') {
        // Test a like trigger by simulating like events to reach the threshold
        const triggerKey = msg.triggerKey?.trim();
        const targetLikes = parseInt(msg.targetLikes);
        
        if (triggerKey && targetLikes > 0) {
          console.log(`🧪 Testing like trigger: every ${targetLikes} likes → "${triggerKey}"`);
          
          // Don't modify the actual totalLikes - just test the trigger
          // Calculate how many likes needed to trigger
          const currentLikes = totalLikes;
          const likesNeeded = targetLikes - (currentLikes % targetLikes);
          const testLikes = likesNeeded === 0 ? targetLikes : likesNeeded;
          
          console.log(`🧪 Simulated +${testLikes} likes (${currentLikes} → ${currentLikes + testLikes}) - TEST ONLY`);
          
          // Execute the key action if not paused (without updating totalLikes)
          if (!isPaused) {
            console.log(`⏰ Waiting 3000ms before executing like trigger test...`);
            setTimeout(async () => {
              // Use the same key injection logic as gifts
              const key = String(triggerKey).toLowerCase();
              const durationMs = 1000; // 1 second duration for test
              
              // Focus guard
              const focus = await checkTargetWindowFocused();
              if (!focus.ok) {
                console.log('Target window not focused; skipping like key trigger test');
                return;
              }

              console.log(`Like trigger test: Press key "${key}" for ${durationMs}ms (mode=${currentInjectionMode})`);
              
              if (currentInjectionMode === 'autohotkey') {
                const ahkPath = process.env.AHK_PATH || 'AutoHotkey.exe';
                const ahkKey = mapKeyToAhk(key);
                const titleMatch = targetWindowKeyword;

                const v2script = buildAhkHoldScriptV2(ahkKey, durationMs, titleMatch);
                const v1script = buildAhkHoldScriptV1(ahkKey, durationMs, titleMatch);

                const tmpV2 = path.join(os.tmpdir(), `ttlrl_like_test_${Date.now()}_${Math.random().toString(36).slice(2)}_v2.ahk`);
                fs.writeFileSync(tmpV2, v2script, 'utf8');
                const v2ok = await runAhk(ahkPath, tmpV2);
                try { fs.unlinkSync(tmpV2); } catch {}
                if (!v2ok) {
                  const tmpV1 = path.join(os.tmpdir(), `ttlrl_like_test_${Date.now()}_${Math.random().toString(36).slice(2)}_v1.ahk`);
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
            }, 3000);
          }
        }
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

      if (msg.type === 'connect-tiktok') {
        // Connect to a TikTok username
        const targetUsername = String(msg.username || '').trim();
        if (!targetUsername) {
          console.log('❌ TikTok connection request missing username');
          ws.send(JSON.stringify({ 
            type: 'connection-error', 
            error: 'Username is required' 
          }));
          return;
        }
        
        console.log(`📨 Received TikTok connection request for @${targetUsername}`);
        const success = await connectToTikTok(targetUsername);
        
        if (success) {
          console.log(`✅ TikTok connection successful for @${targetUsername}`);
          ws.send(JSON.stringify({ 
            type: 'connection-success', 
            username: targetUsername 
          }));
        } else {
          console.log(`❌ TikTok connection failed for @${targetUsername}`);
        }
      }

      if (msg.type === 'disconnect-tiktok') {
        // Disconnect from TikTok
        console.log('Disconnect request received');
        await disconnectFromTikTok();
      }

      if (msg.type === 'get-connection-status') {
        // Send current connection status
        ws.send(JSON.stringify({
          type: 'connection-status',
          status: connectionStatus,
          username: username,
          error: connectionError,
          isLive: isLive
        }));
      }

      if (msg.type === 'reset-like-counts') {
        // Reset total likes and all trigger counts
        console.log('🔄 Resetting like counts and trigger counts');
        totalLikes = 0;
        
        // Broadcast the reset to all clients
        broadcast({ 
          type: 'like', 
          likeCount: 0, 
          totalLikes: 0 
        });
        
        // Send success response
        ws.send(JSON.stringify({ 
          type: 'reset-success', 
          message: 'Like counts reset successfully' 
        }));
      }
    } catch (e) {
      console.error('Invalid WS message', e);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('🔌 WebSocket error:', error);
  });
});

// 2) TikTok Live connector - now dynamic
let username = process.env.TIKTOK_USERNAME || null; // Optional fallback from .env
let tiktok = null;
let connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'error'
let connectionError = null;
let isLive = false; // Track if the connected user is currently live streaming

// TikTok Connection Management
async function connectToTikTok(targetUsername) {
  try {
    console.log(`🔄 Starting TikTok connection process for @${targetUsername}`);
    
    // Disconnect existing connection if any
    if (tiktok) {
      try {
        console.log('🔄 Disconnecting existing connection...');
        await tiktok.disconnect();
        console.log('✅ Existing connection disconnected');
      } catch (e) {
        console.log('⚠️ Error disconnecting previous connection:', e.message);
      }
    }

    connectionStatus = 'connecting';
    connectionError = null;
    isLive = false;
    username = targetUsername;
    
    console.log('📡 Broadcasting connection status: connecting');
    broadcast({ 
      type: 'connection-status', 
      status: connectionStatus, 
      username: username,
      error: null,
      isLive: false
    });

    console.log(`🔗 Creating WebcastPushConnection for @${username}...`);
    
    // Create new connection
    tiktok = new WebcastPushConnection(username, {
      enableExtendedGiftInfo: true,
    });

    console.log('🎧 Setting up TikTok event listeners...');
    // Set up event listeners
    setupTikTokEventListeners();

    console.log('🚀 Attempting to connect to TikTok Live...');
    // Attempt connection
    await tiktok.connect();
    
    connectionStatus = 'connected';
    isLive = true; // Assume live when connection succeeds
    console.log(`✅ Successfully connected to @${username}`);
    
    console.log('📡 Broadcasting connection success...');
    broadcast({ 
      type: 'connection-status', 
      status: connectionStatus, 
      username: username,
      error: null,
      isLive: true
    });
    
    return true;
    
  } catch (error) {
    console.error(`❌ TikTok connection failed for @${targetUsername}:`, error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    connectionStatus = 'error';
    connectionError = error.message;
    isLive = false;
    
    console.log('📡 Broadcasting connection error...');
    broadcast({ 
      type: 'connection-status', 
      status: connectionStatus, 
      username: username,
      error: connectionError,
      isLive: false
    });
    
    return false;
  }
}

function setupTikTokEventListeners() {
  if (!tiktok) return;

  // Gift event listener
  tiktok.on('gift', (data) => {
  const giftName = (data?.giftName || '').toLowerCase();
  const displayName = data?.giftName || '';
  const senderName = data?.uniqueId || 'Unknown';
  const imageUrl =
    data?.giftPictureUrl || data?.giftImageUrl || (data?.gift && data.gift.pictureUrl) || null;
  const ts = Date.now();
  
  // Store gift info in dynamic catalog for real image URLs
  if (displayName && !dynamicGiftCatalog.has(giftName)) {
    const giftInfo = {
      id: data?.giftId || data?.gift?.id || giftName,
      name: displayName,
      imageUrl: imageUrl,
      diamondCount: data?.diamondCount || data?.gift?.diamond_count || 0,
      lastSeen: ts,
      description: `${displayName} - ${data?.diamondCount || 0} diamonds`
    };
    dynamicGiftCatalog.set(giftName, giftInfo);
    console.log(`Added gift to dynamic catalog: ${displayName} with image: ${imageUrl ? 'YES' : 'NO'}`);
  }
  
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
    
    // Debug: Log the broadcast message
    const broadcastMsg = { type: 'like', likeCount, totalLikes };
    console.log(`📡 Broadcasting like update:`, broadcastMsg);
    
    broadcast(broadcastMsg);
  });

  // Connection state events
  tiktok.on('connected', (state) => {
    connectionStatus = 'connected';
    isLive = true;
    console.log('TikTok Live connected!', state);
    broadcast({ 
      type: 'connection-status', 
      status: connectionStatus, 
      username: username,
      error: null,
      isLive: true
    });
  });

  tiktok.on('disconnected', () => {
    connectionStatus = 'disconnected';
    isLive = false;
    console.log('TikTok Live disconnected');
    broadcast({ 
      type: 'connection-status', 
      status: connectionStatus, 
      username: username,
      error: null,
      isLive: false
    });
  });

  tiktok.on('streamEnd', () => {
    isLive = false;
    console.log('Stream ended');
    broadcast({ 
      type: 'stream-end',
      connectionStatus,
      username,
      isLive: false
    });
    broadcast({ 
      type: 'connection-status', 
      status: connectionStatus, 
      username: username,
      error: null,
      isLive: false
    });
  });

  tiktok.on('error', (error) => {
    connectionStatus = 'error';
    connectionError = error.message;
    isLive = false;
    console.error('TikTok Live error:', error);
    broadcast({ 
      type: 'connection-status', 
      status: connectionStatus, 
      username: username,
      error: connectionError,
      isLive: false
    });
  });
}

async function disconnectFromTikTok() {
  if (tiktok) {
    try {
      await tiktok.disconnect();
      connectionStatus = 'disconnected';
      connectionError = null;
      isLive = false;
      console.log('✅ Disconnected from TikTok Live');
      
      broadcast({ 
        type: 'connection-status', 
        status: connectionStatus, 
        username: username,
        error: null,
        isLive: false
      });
      
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }
}

// Auto-connect if username is provided in .env
if (username) {
  console.log(`Auto-connecting to @${username} from .env...`);
  connectToTikTok(username).catch(console.error);
}

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

  const isMouseRight = key === 'right_click' || key === 'mouse_right' || key === 'rmouse';
  const isMouseLeft = key === 'left_click' || key === 'mouse_left' || key === 'lmouse';

  // Support new durationSec while remaining backward compatible with durationMs
  const durationMs = action.durationSec != null ? Math.max(0, Number(action.durationSec) * 1000) : Number(action.durationMs || 300);

  try {
    if (isMouseRight || isMouseLeft) {
      const mouseButtonConst = isMouseRight ? sender.BUTTON_RIGHT : sender.BUTTON_LEFT;
      const ahkKey = isMouseRight ? 'RButton' : 'LButton';
      const label = isMouseRight ? 'Right-click' : 'Left-click';
      console.log(`${label} for ${durationMs}ms (mode=${currentInjectionMode}) (from ${senderName})`);

      if (currentInjectionMode === 'autohotkey') {
        const ahkPath = process.env.AHK_PATH || 'AutoHotkey.exe';
        const titleMatch = targetWindowKeyword;

        const v2script = buildAhkHoldScriptV2(ahkKey, durationMs, titleMatch);
        const v1script = buildAhkHoldScriptV1(ahkKey, durationMs, titleMatch);

        const tmpV2 = path.join(os.tmpdir(), `ttlrl_mouse_${Date.now()}_${Math.random().toString(36).slice(2)}_v2.ahk`);
        fs.writeFileSync(tmpV2, v2script, 'utf8');
        const v2ok = await runAhk(ahkPath, tmpV2);
        try { fs.unlinkSync(tmpV2); } catch {}
        if (!v2ok) {
          const tmpV1 = path.join(os.tmpdir(), `ttlrl_mouse_${Date.now()}_${Math.random().toString(36).slice(2)}_v1.ahk`);
          fs.writeFileSync(tmpV1, v1script, 'utf8');
          await runAhk(ahkPath, tmpV1);
          try { fs.unlinkSync(tmpV1); } catch {}
        }
        lastFiredAtByGift[giftNameLower] = Date.now();
        return;
      }

      // nodesender paths
      try {
        if (currentInjectionMode === 'nodesender_repeat') {
          // emulate rapid clicks
          const intervalMs = Math.max(5, Number(process.env.REPEAT_INTERVAL_MS || action.repeatIntervalMs || 20));
          const taps = Math.max(1, Math.floor(durationMs / intervalMs));
          sender.startBatch();
          for (let i = 0; i < taps; i++) {
            const wait = i === 0 ? 0 : intervalMs;
            sender.batchMouseClick(mouseButtonConst, wait);
          }
          await sender.sendBatch();
        } else {
          // Single hold click
          sender.startBatch();
          sender.batchPressMouseButton(mouseButtonConst, 0);
          sender.batchReleaseMouseButton(mouseButtonConst, durationMs);
          await sender.sendBatch();
        }
        lastFiredAtByGift[giftNameLower] = Date.now();
      } catch (err) {
        console.error('Mouse right-click error:', err);
      }
      return;
    }

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
    // Mouse buttons
    // Mouse left/right aliases
    'left_click': 'LButton',
    'mouse_left': 'LButton',
    'right_click': 'RButton',
    'mouse_right': 'RButton',
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

// Gift Catalog API Functions
async function fetchGiftCatalogFromTikTok() {
  try {
    console.log('Fetching gift catalog from TikTok API...');
    
    // Try multiple methods to get gift data
    let gifts = [];
    
    // Method 1: Use existing connected TikTok instance if available
    if (tiktok && typeof tiktok.getAvailableGifts === 'function') {
      try {
        console.log('Trying to fetch gifts from existing connection...');
        gifts = await tiktok.getAvailableGifts();
        console.log(`Method 1: Fetched ${gifts.length} gifts from existing connection`);
      } catch (err) {
        console.log('Method 1 failed:', err.message);
      }
    }
    
    // Method 2: Create temporary connection if Method 1 failed
    if (gifts.length === 0) {
      try {
        console.log('Trying temporary connection with username...');
        const tempConnection = new WebcastPushConnection(username || '@tiktok', {
          enableExtendedGiftInfo: true,
        });
        gifts = await tempConnection.getAvailableGifts();
        console.log(`Method 2: Fetched ${gifts.length} gifts from temp connection`);
      } catch (err) {
        console.log('Method 2 failed:', err.message);
      }
    }
    
    // Method 3: Try without username as last resort
    if (gifts.length === 0) {
      try {
        console.log('Trying basic connection...');
        const basicConnection = new WebcastPushConnection();
        gifts = await basicConnection.getAvailableGifts();
        console.log(`Method 3: Fetched ${gifts.length} gifts from basic connection`);
      } catch (err) {
        console.log('Method 3 failed:', err.message);
      }
    }
    
    if (gifts.length === 0) {
      throw new Error('All methods failed to fetch gifts');
    }
    
    // Debug: Log the structure of the first gift to understand the data format
    if (gifts.length > 0) {
      console.log('Sample gift structure:', JSON.stringify(gifts[0], null, 2));
    }
    
    // Transform the data to our format with multiple possible field names
    const catalog = gifts.map(gift => {
      // Try multiple possible field names for each property
      const id = gift.id || gift.gift_id || gift.giftId || String(Math.random());
      const name = gift.name || gift.gift_name || gift.giftName || gift.displayName || 'Unknown Gift';
      
      // Try multiple possible image URL locations
      let imageUrl = null;
      if (gift.image?.url_list?.[0]) imageUrl = gift.image.url_list[0];
      else if (gift.icon?.url_list?.[0]) imageUrl = gift.icon.url_list[0];
      else if (gift.pictureUrl) imageUrl = gift.pictureUrl;
      else if (gift.picture_url) imageUrl = gift.picture_url;
      else if (gift.imageUrl) imageUrl = gift.imageUrl;
      else if (gift.image_url) imageUrl = gift.image_url;
      else if (gift.thumbnail) imageUrl = gift.thumbnail;
      
      const diamondCount = gift.diamond_count || gift.diamondCount || gift.cost || gift.price || 0;
      const description = gift.description || `${name} - ${diamondCount} diamonds`;
      
      return {
        id: String(id),
        name,
        imageUrl,
        diamondCount,
        description
      };
    });
    
    // Filter out any gifts without names
    const validCatalog = catalog.filter(gift => gift.name && gift.name !== 'Unknown Gift');
    
    // Merge with dynamic catalog from live events
    const dynamicGifts = Array.from(dynamicGiftCatalog.values());
    const allGifts = new Map();
    
    // Add API gifts first
    validCatalog.forEach(gift => {
      allGifts.set(gift.name.toLowerCase(), gift);
    });
    
    // Add/override with dynamic gifts (they have real image URLs)
    dynamicGifts.forEach(gift => {
      const key = gift.name.toLowerCase();
      if (!allGifts.has(key) || (gift.imageUrl && !allGifts.get(key).imageUrl)) {
        allGifts.set(key, gift);
      }
    });
    
    const mergedCatalog = Array.from(allGifts.values());
    console.log(`Successfully processed ${mergedCatalog.length} total gifts (${validCatalog.length} from API, ${dynamicGifts.length} from live events)`);
    
    // Cache the result
    giftCatalogCache = mergedCatalog;
    catalogCacheTimestamp = Date.now();
    
    return mergedCatalog;
    
  } catch (error) {
    console.warn('Failed to fetch gift catalog from TikTok:', error.message);
    console.log('Falling back to enhanced catalog with curated gift data...');
    
    // Even if API fails, include any dynamic gifts we've collected
    const dynamicGifts = Array.from(dynamicGiftCatalog.values());
    const fallbackGifts = getEnhancedFallbackCatalog();
    
    // Merge fallback with dynamic gifts
    const allGifts = new Map();
    fallbackGifts.forEach(gift => allGifts.set(gift.name.toLowerCase(), gift));
    dynamicGifts.forEach(gift => {
      const key = gift.name.toLowerCase();
      if (!allGifts.has(key) || gift.imageUrl) {
        allGifts.set(key, gift);
      }
    });
    
    const finalCatalog = Array.from(allGifts.values());
    console.log(`Fallback catalog: ${finalCatalog.length} gifts (${fallbackGifts.length} fallback + ${dynamicGifts.length} dynamic)`);
    
    // Cache the result
    giftCatalogCache = finalCatalog;
    catalogCacheTimestamp = Date.now();
    
    return finalCatalog;
  }
}

function getEnhancedFallbackCatalog() {
  // Enhanced fallback with sample gift data and placeholder images
  return [
    {
      id: 'star',
      name: 'Star',
      imageUrl: 'https://img.icons8.com/emoji/48/star-emoji.png',
      diamondCount: 1,
      description: 'Basic star gift - spread some sparkle!'
    },
    {
      id: 'rose',
      name: 'Rose',
      imageUrl: 'https://img.icons8.com/emoji/48/rose-emoji.png',
      diamondCount: 1,
      description: 'Beautiful rose - show your appreciation'
    },
    {
      id: 'letcook',
      name: "Let 'Em Cook",
      imageUrl: 'https://img.icons8.com/emoji/48/cooking-emoji.png',
      diamondCount: 5,
      description: 'Cooking celebration - let them work!'
    },
    {
      id: 'gg',
      name: 'GG',
      imageUrl: 'https://img.icons8.com/emoji/48/trophy-emoji.png',
      diamondCount: 1,
      description: 'Good game - respect the play'
    },
    {
      id: 'gamecontroller',
      name: 'Game Controller',
      imageUrl: 'https://img.icons8.com/emoji/48/video-game-emoji.png',
      diamondCount: 10,
      description: 'Gaming controller - for the gamers'
    },
    {
      id: 'heartsuperstage',
      name: 'Heart Superstage',
      imageUrl: 'https://img.icons8.com/emoji/48/red-heart-emoji.png',
      diamondCount: 100,
      description: 'Premium heart gift with stage effects'
    },
    {
      id: 'heartstage',
      name: 'Heart Stage',
      imageUrl: 'https://img.icons8.com/emoji/48/heart-with-arrow-emoji.png',
      diamondCount: 50,
      description: 'Stage heart effect - love with style'
    },
    {
      id: 'heartitout',
      name: 'Heart It Out',
      imageUrl: 'https://img.icons8.com/emoji/48/two-hearts-emoji.png',
      diamondCount: 25,
      description: 'Heart explosion - maximum love'
    },
    {
      id: 'iheartyou',
      name: 'iHeart You',
      imageUrl: 'https://img.icons8.com/emoji/48/heart-with-ribbon-emoji.png',
      diamondCount: 15,
      description: 'Love expression - from the heart'
    },
    {
      id: 'goldengamepad',
      name: 'Golden Gamepad',
      imageUrl: 'https://img.icons8.com/emoji/48/crown-emoji.png',
      diamondCount: 500,
      description: 'Premium gaming gift - for champions'
    },
    {
      id: 'imnewhere',
      name: "I'm New Here",
      imageUrl: 'https://img.icons8.com/emoji/48/waving-hand-emoji.png',
      diamondCount: 1,
      description: 'Welcome gift - say hello!'
    },
    {
      id: 'hifriend',
      name: 'Hi Friend',
      imageUrl: 'https://img.icons8.com/emoji/48/handshake-emoji.png',
      diamondCount: 1,
      description: 'Friendly greeting - make connections'
    }
  ];
}

// HTTP Server for API endpoints
const httpPort = Number(process.env.HTTP_PORT || 3001);
const server = http.createServer(async (req, res) => {
  const { pathname } = url.parse(req.url);
  
  // CORS headers for frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }
  
  // Gift Catalog API
  if (pathname === '/api/gifts/catalog' && req.method === 'GET') {
    try {
      // Check cache first (cache for 1 hour)
      const cacheAge = Date.now() - catalogCacheTimestamp;
      const cacheValid = giftCatalogCache && cacheAge < (60 * 60 * 1000);
      
      let catalog;
      if (cacheValid) {
        console.log('Serving cached gift catalog');
        catalog = giftCatalogCache;
      } else {
        console.log('Fetching fresh gift catalog');
        catalog = await fetchGiftCatalogFromTikTok();
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify(catalog));
      
    } catch (error) {
      console.error('Error serving gift catalog:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to fetch gift catalog' }));
    }
    return;
  }
  
  // 404 for unknown endpoints
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(httpPort, () => {
  console.log(`HTTP API server listening on http://localhost:${httpPort}`);
  console.log(`Gift catalog available at: http://localhost:${httpPort}/api/gifts/catalog`);
});


