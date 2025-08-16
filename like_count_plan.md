# Like Count Tracking & Trigger Plan

> **Goal:** Track TikTok LIVE total likes and execute user-defined key presses **using the *same* backend macro mechanism already powering gift-mapping** (i.e. `node-key-sender` batches via `backend/index.js`). Styling is out of scope for this MVP; we only need functional proof-of-concept.

---

## 1. Functional Requirements
1. **Real-time Like Tracking**
   - Subscribe to the `like` event via `tiktok-live-connector`.
   - Display **Total Likes** inside the Live Feed section header.
2. **Threshold-Based Key Presses (Simple)**
   - User can add one or more *Like Triggers* consisting of:
     - `threshold` (integer), e.g. **100**.
     - `key` to press, e.g. **a**.
     - `durationMs` (optional, default `300 ms`).
   - **Important:** When a trigger fires we *send a WS message to the backend*:
     ```json
     { "type": "like-key", "key": "a", "durationMs": 300 }
     ```
     The backend adds a minimal handler that calls the existing `handleGiftByName` logic path (or equivalent helper) so the key press is executed **identically** to gift mappings.
   - Example presets:
     | Threshold | Fired Action |
     |-----------|--------------|
     | 100       | key "a" for 300 ms |
     | 1,000     | key "b" for 10,000 ms |
3. **User Customization**
   - GUI to add, edit, reorder, enable/disable triggers.
   - Persist settings in local storage (or Supabase if multi-device sync required).
   - Validation (min 1 like, max 1 000 000 likes, no key conflicts).
4. **Location in Layout**
   - **Total Likes:** Top area of *LiveFeedSection* (beneath viewer count).
   - **Trigger Controls:** Bottom-right panel adjacent to the Live Feed.
   - Collapsible/expandable for minimal footprint.
5. **Accessibility & Feedback**
   - ARIA labels for all form controls.
   - Toast/notification when a trigger fires (shows threshold + action).

---

## 2. Architectural Overview
**Data Flow (simplified)**
1. `LikeService` (frontend) listens to `like` events via *tiktok-live-connector*.
2. `totalLikes` stored in a simple React state or Context.
3. `LikeTriggerEngine` watches `totalLikes` and, on reaching each `threshold × n`, sends `{ type:'like-key', key, durationMs }` via WebSocket.
4. Backend receives `like-key` message and calls **exact same key-injection code** used for gifts (`node-key-sender` batches / current injection mode).

---

## 3. Implementation Steps
1. **Listen to Likes**
   - Instantiate `WebcastPushConnection` and update a `totalLikes` counter on each `'like'` event.
2. **Local Trigger List (state)**
   ```js
   const [triggers, setTriggers] = useState([
     { id: 'uuid1', threshold: 100, key: 'a', durationMs: 300, firedCount: 0 },
     { id: 'uuid2', threshold: 1000, key: 'b', durationMs: 10000, firedCount: 0 }
   ]);
   ```
3. **LikeTriggerEngine**
   ```js
   useEffect(() => {
     triggers.forEach(t => {
       const multiplier = Math.floor(totalLikes / t.threshold);
       if (multiplier > t.firedCount) {
         ws.send(JSON.stringify({ type: 'like-key', key: t.key, durationMs: t.durationMs }));
         t.firedCount = multiplier; // update locally
       }
     });
   }, [totalLikes]);
   ```
4. **Backend Handler (small addition)**
   ```js
   // inside ws.on('message') switch
   if (msg.type === 'like-key') {
     const key = String(msg.key || '').toLowerCase();
     const durationMs = Math.max(0, Number(msg.durationMs || 300));
     // Re-use existing nodesender batch logic
     sender.startBatch();
     sender.batchTypeKey(key, 0, sender.BATCH_EVENT_KEY_DOWN);
     sender.batchTypeKey(key, durationMs, sender.BATCH_EVENT_KEY_UP);
     await sender.sendBatch();
   }
   ```
   Nothing else changes; this guarantees identical behaviour to gift macros.
5. **Minimal UI for Testing**
   - Show total likes counter (text only).
   - Show list of triggers (threshold & key) with *Add* button.
   - No advanced styling yet.
6. **Quick Manual Test**
   - Start backend & frontend.
   - Create triggers at 10-like increments for easy testing.
   - Tap likes in your live; observe keys firing in target app/window.

---

## 4. Future Enhancements (Optional Later)
1. Persist triggers to localStorage / Supabase.
2. Add sound or visual feedback when a trigger fires.
3. Add export/import of trigger sets.

---

**End of Simplified MVP Plan**
