## Goal

Aggregate identical live feed events into a single card per sender+gift, and show a count badge that increments smoothly on each subsequent gift. Keep the newest activity at the top, retain existing image/username/timestamp layout, and animate count bumps without re-rendering the entire list.

---

## UX/Behavior

- **One card per pair**: Unique key = `sender (case-insensitive)` + `gift name (case-insensitive)`.
- **Count badge**: Right side of the card shows a count ≥ 1. It increments on repeated events for the same pair.
- **Ordering**: New cards appear at the top. When an existing card is incremented, it jumps to the top (since its last activity is the newest) or optionally stays put; default = jump to top.
- **Animations**:
  - New card: existing slide-in-left animation (150 ms).
  - Count bump: brief scale/pulse animation on the badge (e.g., 150–200 ms), no re-animate the whole card list.
- **Compact feed**: Same fixed-height, scrollable container, newest visible at top.
- **Aging/cleanup** (optional): Auto-remove cards that haven’t updated for N seconds (e.g., 60–120s) to prevent the list from growing indefinitely.

---

## Data Model (Frontend)

- `aggregatedFeedMap: Record<string, AggregatedItem>` keyed by `key = senderLower + '|' + giftLower` for O(1) updates.
- `aggregatedFeedOrder: string[]` stores keys ordered by `lastTime` desc for rendering.
- `AggregatedItem`:
  - `id: string` (stable, e.g., `key`)
  - `sender: string`
  - `gift: string`
  - `imageUrl: string | null`
  - `count: number`
  - `firstTime: number` (ms)
  - `lastTime: number` (ms)
  - `fresh: boolean` (new card animation)
  - `bumpToken?: number` (changes to trigger count badge animation)

---

## Update Algorithm (Frontend only)

1. On `gift` message `{ giftName, sender, imageUrl, ts }`:
   - Normalize: `senderKey = sender.trim().toLowerCase()`, `giftKey = giftName.trim().toLowerCase()`.
   - `key = senderKey + '|' + giftKey`.
2. If `aggregatedFeedMap[key]` exists:
   - `item.count += 1`
   - `item.lastTime = ts || Date.now()`
   - `item.bumpToken = (item.bumpToken || 0) + 1` (this forces a new CSS class name or data-attribute for animation)
   - Reorder `aggregatedFeedOrder`: move `key` to the front (newest first)
3. Else (new card):
   - Create `AggregatedItem` with `count = 1`, `firstTime = lastTime = ts || Date.now()`, `fresh = true`, `bumpToken = 1`
   - Insert `key` at the front of `aggregatedFeedOrder`
4. Trim: keep first 100–200 entries max
5. Schedule `fresh` reset (e.g., set `fresh = false` after 200 ms) so new cards don’t re-animate on any subsequent state updates
6. Optional cleanup loop (interval): remove items where `Date.now() - lastTime > TTL`

All of the above can be done with a single state update using a reducer, or using `setState(prev => { ... })` that mutates copies of `map` and `order` for immutability.

---

## Rendering Strategy

- Build a derived array `aggregatedFeed = aggregatedFeedOrder.map(k => aggregatedFeedMap[k])`.
- Render top-to-bottom (newest first).
- Card UI:
  - Left: image (if available) or placeholder
  - Middle: username (bold) + subtitle “sent ‘gift’”
  - Right: timestamp (lastTime) on top-right
  - Right-badge: count pill (e.g., rounded bg, monospace/tabular-nums) with a bump animation keyed by `bumpToken` so each increment retriggers animation without remounting the card

---

## CSS/Animation Plan

- Keep `.slide-in-left` for new card animations (150 ms).
- Add `.count-bump` keyframes, e.g.:

```css
.count-bump-anim {
  animation: count-bump 180ms ease-out both;
}
@keyframes count-bump {
  0% { transform: scale(1); }
  40% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

- Apply class like `count-bump-${bumpToken}` to the badge so it changes on every increment and restarts the animation.

---

## Minimal Code Changes (Outline)

1. State setup in `App.jsx`:
   - Replace `liveFeed` array with two states: `feedMap`, `feedOrder` (or a single reducer containing both)
2. Gift handler:
   - Implement the update algorithm above; generate key, update count and lastTime, move key to top
3. Rendering:
   - Build derived `aggregatedFeed` from `map+order`
   - Card component receives `{ sender, gift, imageUrl, lastTime, count, fresh, bumpToken }`
   - Card root class: `slide-in-left` when `fresh` is true; remove after 200 ms
   - Count badge class: `count-bump-anim` with a `key` or `data-bump={bumpToken}` to re-trigger animation

---

## Edge Cases

- TikTok streaks: the connector may send repeat/streak gifts rapidly. The aggregation handles this naturally by incrementing count per event. If the payload includes `repeatCount`, you can add that amount instead of `+1`.
- Username/gift normalization: always lowercase and trim to prevent duplicate cards due to casing/spaces.
- Image changes: prefer latest non-null `imageUrl` seen for the same pair.
- Sorting stability: order strictly by `lastTime` desc; on tie, add an internal sequence counter to break ties.

---

## Testing Checklist

- Single user sends the same gift N times rapidly → one card with count N, badge bumps each time, card stays at top
- Multiple users send the same gift → separate cards (keyed by user)
- Same user sends different gifts → separate cards (keyed by gift)
- Old cards are removed after TTL (if enabled)
- No global re-flow or re-animation of older cards when new ones arrive

---

## Optional Enhancements

- Badge color scales with count thresholds (e.g., 5+, 10+, 25+)
- Per-card TTL that increases with count
- Clicking a card expands a detail view (first/last timestamps, total count)
- Export recent aggregated activity as JSON for analytics


