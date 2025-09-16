# 🏗 TikTok Live Event to Keyboard Macro Project Plan

## **1. TikTok Live Event Listener**
**Goal:** Receive TikTok gift events in real time.

* **Library:** `tiktok-live-connector` (Node.js)
* **Steps:**
  1. Create a Node.js backend service
  2. Connect to a TikTok username's livestream
  3. Listen for `"gift"` events
  4. Send event details (gift name, sender, etc.) to the frontend via **WebSockets**

## **2. Web App for Key Bind Mapping**
**Goal:** Let users choose which gift triggers which key, how long it's pressed, and save these settings.

* **Frontend Stack:** React + Tailwind (in Cursor)
* **Features:**
  * Dropdown to select a TikTok gift
  * Dropdown or input box to choose a **keyboard key**
  * Number input for **press duration** (seconds or milliseconds)
  * List view to see and edit mappings
  * Save settings to **local storage**

## **3. Macro Execution Engine**
**Goal:** Trigger the correct keyboard press for the set duration when a gift is received.

* **Approach:**
  * On the backend, use a keyboard simulation library:
    * `robotjs` (good for simple press/release)
    * or `node-key-sender` (easy for sequences)
  * When a `"gift"` event is received:
    1. Look up the gift in the user's mapping
    2. Simulate **key down**
    3. Wait for the mapped duration
    4. Simulate **key up**

## **4. WebSocket Communication**
**Goal:** Keep backend and frontend in sync.

* **Flow:**
  1. Backend sends gift events → frontend shows live feed of triggered actions
  2. Frontend sends updated mappings → backend applies them instantly

## **5. Quality of Life Features**
* **Test Mode:** A button in the UI to trigger a mapping without TikTok
* **Gift Filter:** Ignore spam gifts or set cooldowns
* **Profile Save/Load:** Store different key bind setups for different games
* **Start/Stop Button:** Pause the macro system without closing the app

## **📦 Final Architecture**

```
[ TikTok Live Connector (Node.js) ]
             │
             ▼
      [ WebSocket Server ] ⇄ [ React Web App (Key Mapper) ]
             │
             ▼
[ Keyboard Simulation Engine (robotjs/node-key-sender) ]
```

## **🔹 Development Order**
1. **Backend** – Get TikTok events logging to console
2. **Frontend** – Build mapping UI with mock data
3. **Integration** – Send mappings from frontend to backend
4. **Macro Engine** – Trigger real key presses from gift events
5. **Testing** – Try with Rocket League in casual mode
6. **Polish** – Add cooldowns, save/load mappings, and styling