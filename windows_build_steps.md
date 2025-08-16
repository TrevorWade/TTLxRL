# TikTok Live Event to Keyboard Macro - Build Guide

## Goal and Approach

**Target:** Windows 10/11 only

We'll build a two-process application:
- **Backend:** Node.js service that listens to TikTok Live gifts and triggers keyboard macros
- **Frontend:** React + Tailwind web interface for mapping gifts to keyboard actions

**Architecture:** WebSockets keep frontend and backend synchronized. For keyboard simulation, we'll use Java + `node-key-sender` as our default approach since it's simple and reliable on Windows.

**Build Strategy:** Incremental development with testing at each step:
1. Get TikTok Live gift events logging
2. Build UI for editing gift→key mappings (stored in localStorage)
3. Connect frontend and backend via WebSockets
4. Implement macro engine for actual key presses
5. Add quality-of-life features

## Prerequisites

- **OS:** Windows 10 or Windows 11
- **Runtime:** Node.js 18+ and npm
- **Keyboard Simulation:** Java (OpenJDK 17+) for `node-key-sender`
  - Download from [https://adoptium.net](https://adoptium.net)
  - Verify with `java -version` in terminal
  - Alternative: `@nut-tree/nut-js` (requires Windows Build Tools)
- **Testing:** TikTok account with live streaming capability
- **Optional:** Git for version control

## Project Structure

```
ttl_rl/
├── backend/          # TikTok listener + WebSocket server + macro engine
│   ├── package.json
│   ├── .env         # TikTok username and config
│   └── index.js     # Main backend service
└── frontend/        # React + Tailwind gift→key mapping UI
    ├── package.json
    ├── src/
    │   ├── App.jsx   # Main UI component
    │   ├── ws.ts     # WebSocket client
    │   └── index.css # Tailwind styles
    └── index.html
```

---

## Step 1: Initialize Project Structure

Create the initial folder structure and verify setup:

**✅ Folders Created:**
- `backend/` - Backend Node.js service
- `frontend/` - Frontend React application

**How to Test:**
- Verify both folders exist under `C:\apps\ttl_rl`

---

## Step 2: Backend Setup

Initialize the Node.js backend service with required dependencies.

**Files to Create:**

### `backend/package.json`
```json
{
  "name": "tiktok-macro-backend",
  "version": "1.0.0",
  "description": "TikTok Live gift to keyboard macro backend",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {
    "tiktok-live-connector": "^1.0.0",
    "ws": "^8.0.0",
    "node-key-sender": "^1.0.0",
    "dotenv": "^16.0.0"
  }
}
```

### `backend/.env`
```env
TIKTOK_USERNAME=your_tiktok_username_here
WS_PORT=5178
```

### `backend/index.js`
```js
// Loads environment variables from .env
require('dotenv').config();

const { WebSocketServer } = require('ws');
const TikTokLive = require('tiktok-live-connector').default;
const sender = require('node-key-sender');

// In-memory mapping: { [giftNameLower]: { key: 'a', durationMs: 500 } }
let giftToAction = {};
let isPaused = false;

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

// Handle messages from frontend (mapping updates, pause toggle, test events)
wss.on('connection', (ws) => {
  // Send current state to new client
  ws.send(JSON.stringify({ type: 'init', mapping: giftToAction, paused: isPaused }));

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
        console.log(`[TEST] Simulate gift: ${giftName}`);
        handleGiftByName(giftName, 'TestUser');
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

const tiktok = new TikTokLive(username, {
  enableExtendedGiftInfo: true,
});

// Gift event listener
tiktok.on('gift', (data) => {
  const giftName = (data?.gift?.name || '').toLowerCase();
  const senderName = data?.uniqueId || 'Unknown';
  console.log(`Gift received: ${giftName} from ${senderName}`);
  broadcast({ type: 'gift', giftName, sender: senderName });

  handleGiftByName(giftName, senderName);
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

  const key = String(action.key || '').toLowerCase();
  const durationMs = Number(action.durationMs || 300);

  // node-key-sender supports press/release keys by name
  try {
    console.log(`Press key "${key}" for ${durationMs}ms (from ${senderName})`);
    await sender.pressKey(key);
    await new Promise((r) => setTimeout(r, durationMs));
    await sender.releaseKey(key);
  } catch (err) {
    console.error('Key press error:', err);
  }
}
```

**How to Test:**
1. Navigate to `backend/` directory in terminal
2. Run `npm install` to install dependencies
3. Update `.env` with your actual TikTok username
4. Run `npm start` or `node index.js`

**Expected Output:**
- ✅ "WS listening on ws://localhost:5178"
- ✅ "Connected to TikTok Live as viewer of @your_username" (if live)
- ✅ No errors about missing dependencies

**Troubleshooting:**
- If Java errors occur, ensure OpenJDK 17+ is installed and `java -version` works
- If TikTok connection fails, verify username and live status

---

## Step 3: Frontend Setup (React + Vite + Tailwind)

Create the React frontend application with Tailwind CSS for styling.

**Initial Setup:**
1. Navigate to `frontend/` directory in terminal
2. Run `npm create vite@latest . -- --template react`
3. Run `npm install`
4. Run `npm install -D tailwindcss postcss autoprefixer`
5. Run `npx tailwindcss init -p`

**Files to Create/Modify:**

### `frontend/tailwind.config.js`
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

### `frontend/src/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### `frontend/src/ws.ts`
```ts
// Simple WS client with auto-retry
export type Mapping = Record<string, { key: string; durationMs: number }>;

type Listener = (msg: any) => void;

let socket: WebSocket | null = null;
const listeners: Listener[] = [];

export function connect(onMessage: Listener) {
  listeners.push(onMessage);
  openSocket();
}

function openSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  socket = new WebSocket('ws://localhost:5178');

  socket.onopen = () => {
    console.log('WS connected');
  };
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      listeners.forEach((l) => l(msg));
    } catch (e) {
      console.error('Bad WS message', e);
    }
  };
  socket.onclose = () => {
    console.log('WS closed; retry in 2s');
    setTimeout(openSocket, 2000);
  };
}

export function send(msg: any) {
  const data = JSON.stringify(msg);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(data);
  }
}
```

### `frontend/src/App.jsx`
```jsx
import { useEffect, useMemo, useState } from 'react';
import { connect, send } from './ws';

function useLocalStorage(key, initialValue) {
  const [val, setVal] = useState(() => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initialValue;
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(val));
  }, [key, val]);
  return [val, setVal];
}

export default function App() {
  // mapping: { giftNameLower: { key, durationMs } }
  const [mapping, setMapping] = useLocalStorage('giftMapping', {});
  const [paused, setPaused] = useState(false);
  const [liveFeed, setLiveFeed] = useState([]);

  // Keep backend in sync whenever mapping changes
  useEffect(() => {
    send({ type: 'update-mapping', mapping });
  }, [mapping]);

  useEffect(() => {
    connect((msg) => {
      if (msg.type === 'init') {
        // Pull initial state from backend
        setPaused(!!msg.paused);
        if (msg.mapping && Object.keys(msg.mapping).length && !Object.keys(mapping).length) {
          setMapping(msg.mapping);
        }
      }
      if (msg.type === 'gift') {
        setLiveFeed((f) => [{ time: Date.now(), gift: msg.giftName, sender: msg.sender }, ...f].slice(0, 50));
      }
      if (msg.type === 'pause-updated') {
        setPaused(!!msg.paused);
      }
    });
  }, []);

  function upsertMapping(giftName, key, durationMs) {
    const gift = giftName.toLowerCase().trim();
    if (!gift) return;
    const next = { ...mapping, [gift]: { key, durationMs: Number(durationMs) || 300 } };
    setMapping(next);
  }

  function removeMapping(giftName) {
    const gift = giftName.toLowerCase();
    const next = { ...mapping };
    delete next[gift];
    setMapping(next);
  }

  function testGift(giftName) {
    send({ type: 'test-gift', giftName });
  }

  function togglePause() {
    send({ type: 'toggle-pause', paused: !paused });
  }

  const rows = useMemo(() => Object.entries(mapping), [mapping]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <h1 className="text-2xl font-bold mb-4">TikTok Gift → Key Mapper</h1>

      <div className="flex gap-4 mb-6">
        <button onClick={togglePause} className={`px-3 py-2 rounded ${paused ? 'bg-yellow-600' : 'bg-emerald-600'}`}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <AddRow onAdd={upsertMapping} />
      </div>

      <table className="w-full text-left mb-8">
        <thead>
          <tr className="text-slate-300">
            <th className="py-2">Gift name</th>
            <th className="py-2">Key</th>
            <th className="py-2">Duration (ms)</th>
            <th className="py-2">Test</th>
            <th className="py-2">Remove</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([gift, cfg]) => (
            <tr key={gift} className="border-t border-slate-700">
              <td className="py-2">{gift}</td>
              <td className="py-2">{cfg.key}</td>
              <td className="py-2">{cfg.durationMs}</td>
              <td className="py-2">
                <button onClick={() => testGift(gift)} className="px-2 py-1 bg-blue-600 rounded">Run</button>
              </td>
              <td className="py-2">
                <button onClick={() => removeMapping(gift)} className="px-2 py-1 bg-red-600 rounded">X</button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="py-4 text-slate-400">No mappings yet. Add one above.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 className="text-xl font-semibold mb-2">Live feed</h2>
      <ul className="space-y-1">
        {liveFeed.map((e) => (
          <li key={e.time} className="text-sm text-slate-300">
            {new Date(e.time).toLocaleTimeString()} — {e.sender} sent “{e.gift}”
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddRow({ onAdd }) {
  const [gift, setGift] = useState('');
  const [key, setKey] = useState('a');
  const [duration, setDuration] = useState(300);

  return (
    <div className="flex gap-2">
      <input
        placeholder="Gift name (e.g., Rose)"
        className="bg-slate-800 px-3 py-2 rounded"
        value={gift}
        onChange={(e) => setGift(e.target.value)}
      />
      <input
        placeholder="Key (e.g., a)"
        className="bg-slate-800 px-3 py-2 rounded"
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      <input
        type="number"
        placeholder="Duration (ms)"
        className="bg-slate-800 px-3 py-2 rounded w-36"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />
      <button
        onClick={() => onAdd(gift, key, duration)}
        className="px-3 py-2 bg-indigo-600 rounded"
      >
        Add / Update
      </button>
    </div>
  );
}
```

**How to Test:**
1. **Start Backend** (Terminal 1):
   ```bash
   cd C:\apps\ttl_rl\backend
   npm start
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd C:\apps\ttl_rl\frontend
   npm run dev
   ```

3. **Test the Application:**
   - Open the local URL shown in terminal (usually `http://localhost:5173`)
   - Add a mapping: Gift "Rose" → Key "a" → Duration "300"
   - Click "Run" to test
   - Open Notepad and focus on it, then click "Run" again
   - You should see the "a" key pressed in Notepad

**Expected Results:**
- ✅ Frontend loads with dark theme and mapping interface
- ✅ Backend logs show "[TEST] Simulate gift: rose"
- ✅ Key press appears in focused application (Notepad)
- ✅ Live feed shows test events

---

## Step 4: Real TikTok Live Integration

Test the complete flow with actual TikTok Live gifts.

**Setup:**
1. Go live on TikTok with the account specified in `TIKTOK_USERNAME`
2. Keep both backend and frontend running
3. Ensure your game or target application is ready

**Expected Behavior:**
When a viewer sends a mapped gift:
- ✅ Frontend "Live feed" displays the gift and sender name
- ✅ Backend logs the gift event
- ✅ Mapped key is pressed for the specified duration
- ✅ Target application receives the key input

**How to Test:**
1. Map a cheap gift (e.g., "Rose") to a key in the frontend
2. Ask a friend or use a secondary account to send the gift
3. Focus your target application (game/Notepad)
4. Verify the key press occurs when gift is sent
5. Check the live feed updates in real-time

---

## Step 5: Quality of Life Features

Add these features incrementally. Keep changes small and simple.

### 5.1 Gift Cooldowns
Prevent spam by limiting how often each gift can trigger actions.

**Implementation:**
- Store `lastFiredAt` timestamp per gift in backend
- Ignore gifts if `Date.now() - lastFiredAt < cooldownMs`
- Make cooldown configurable per gift or globally

**Test:** Trigger Test Mode twice quickly; verify only first press fires

### 5.2 Pause/Resume System
**Status:** ✅ Already implemented in the base code
- Pause button stops all macro actions instantly
- Resume button re-enables gift processing

### 5.3 Profile Management
Save different key binding setups for different games.

**Implementation:**
- Serialize mappings under named profile keys in localStorage
- Example: `giftMapping:RocketLeague`, `giftMapping:Valorant`
- Add dropdown to load/save/switch profiles

**Test:** Create two profiles with different mappings; verify switching works

### 5.4 Gift Filtering
Ignore specific gifts or set up spam protection.

**Implementation:**
- Maintain ignored gifts list in frontend
- Filter before sending mappings to backend
- Or implement server-side filtering before macro execution

---

## Step 6: Deployment & Reliability

### 6.1 Startup Automation
**Goal:** Run both services automatically

**Options:**
- Create `.ps1` scripts for easy startup
- Use task scheduler for auto-start on boot
- Create desktop shortcuts for quick launch

### 6.2 Window Focus & Permissions
**Key Points:**
- Windows sends simulated keys to the **focused application**
- Ensure your target game/app has focus when testing
- Some games require "Run as Administrator" for key input acceptance
- Try windowed/borderless mode if fullscreen blocks inputs

### 6.3 Alternative Keyboard Library
If `node-key-sender` causes issues, switch to `@nut-tree/nut-js`:

```bash
npm uninstall node-key-sender
npm install @nut-tree/nut-js
```

**Update macro engine:**
```js
const { keyboard, Key, sleep } = require('@nut-tree/nut-js');

// Replace press/release logic:
await keyboard.pressKey(Key.A);
await sleep(durationMs);
await keyboard.releaseKey(Key.A);
```

**Note:** nut.js requires Windows Build Tools and additional setup

---

## Step 7: Security & Stability

### 7.1 Input Validation
- Validate incoming mapping payloads in backend
- Sanitize gift names and key inputs
- Prevent injection attacks through user input

### 7.2 Rate Limiting
- Implement per-gift cooldowns
- Add per-sender rate limits
- Prevent spam and abuse

### 7.3 Connection Handling
- ✅ WebSocket auto-reconnect already implemented
- ✅ TikTok connector error handling included
- Monitor connection health and log issues

---

## Step 8: Final Testing Checklist

### 8.1 Core Functionality
- [ ] Backend starts without errors
- [ ] TikTok Live connection establishes
- [ ] WebSocket server accepts connections
- [ ] Frontend loads and displays correctly

### 8.2 Mapping System
- [ ] Can create/edit/delete gift mappings
- [ ] Mappings persist in localStorage
- [ ] Frontend syncs with backend properly
- [ ] Test Mode triggers correct key presses

### 8.3 Live Integration
- [ ] Real TikTok gifts trigger mapped actions
- [ ] Key presses work in target applications
- [ ] Live feed updates show gift events
- [ ] Pause/resume functions correctly

### 8.4 Quality Features (Optional)
- [ ] Gift cooldowns prevent spam
- [ ] Profile switching works
- [ ] Gift filtering operates correctly

---

## Troubleshooting Guide

### Java Issues
**Problem:** "Cannot find Java" or "java not recognized"
**Solution:** 
- Install OpenJDK 17+ from [adoptium.net](https://adoptium.net)
- Restart terminal/PowerShell after installation
- Verify with `java -version`

### Key Input Problems
**Problem:** Keys not reaching the target application
**Solutions:**
- Ensure the target window has focus
- Try running backend as Administrator
- Switch to windowed/borderless mode instead of fullscreen
- Consider switching to `@nut-tree/nut-js` library

### TikTok Connection Issues
**Problem:** Cannot connect to TikTok Live
**Solutions:**
- Verify username is correct in `.env`
- Ensure the account is currently live streaming
- Check for VPN/firewall blocking connections
- Try different network if corporate firewall is blocking

### WebSocket Connection Failures
**Problem:** Frontend cannot connect to backend
**Solutions:**
- Ensure backend is running on correct port (5178)
- Check Windows Firewall settings
- Verify no other service is using the port

---

## Future Enhancements

### Polish Features
- **Import/Export:** JSON-based mapping backup/restore
- **Gift Icons:** Visual gift display with TikTok gift icons
- **Advanced Cooldowns:** Per-gift and per-sender rate limiting
- **Visual Feedback:** Toast notifications when macros fire
- **Sound Effects:** Audio cues for gift events

### Advanced Features
- **Multiple Games:** Game-specific profile auto-switching
- **Macro Sequences:** Complex key combinations and sequences
- **Analytics:** Usage statistics and popular gift tracking
- **Remote Control:** Mobile app for remote monitoring

### Technical Improvements
- **Performance:** Event batching for high-traffic streams
- **Reliability:** Persistent storage for backend state
- **Security:** Encrypted communication and input validation
- **Monitoring:** Health checks and automatic recovery

---

## Summary

This guide provides a complete implementation path for a TikTok Live gift-to-keyboard macro system:

✅ **Incremental Development** - Step-by-step with testing at each stage
✅ **Windows Optimized** - Tailored for Windows 10/11 environments  
✅ **Production Ready** - Includes error handling, reconnection logic, and security considerations
✅ **User Friendly** - Clean UI with real-time feedback and easy configuration
✅ **Extensible** - Architecture supports future enhancements and customization

**Total Implementation Time:** 4-8 hours depending on experience level
**Dependencies:** Node.js, Java (for keyboard simulation), TikTok Live account