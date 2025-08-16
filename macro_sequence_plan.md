# Macro Sequences: Multi‑press and Text Input Plan (Windows 10/11)

## Objective
Enable mapping a TikTok gift to a sequence of keystrokes and text. Example: when “GG” gift arrives while Rocket League is focused, press Enter, type “gg”, press Enter.

---

## UX/Feature Overview
- Action types per gift:
  - Simple key press (existing)
  - Sequence (new)
- Sequence editor in the frontend:
  - Step list with reordering and deletion
  - Add step: Key Tap, Key Down, Key Up, Text, Wait, Combination (e.g., Ctrl+V)
  - Per‑step delay (ms) before the step executes
  - Preview/Run Test button
- Display: in the mapping table, show “Sequence (N steps)” for sequence actions
- Persist: store sequences in localStorage; sync entire mapping to backend via WS

---

## Data Model

### Frontend/Backend schema (backward compatible)
```ts
// Existing simple action (unchanged)
interface SimpleAction {
  type: 'press';
  key: string;          // e.g., 'enter', 'a'
  durationMs: number;   // press duration for hold
}

// New sequence action
interface SequenceAction {
  type: 'sequence';
  steps: SequenceStep[];
}

type Action = SimpleAction | SequenceAction;

type SequenceStep =
  | { kind: 'keyTap'; key: string; delayMs?: number }
  | { kind: 'keyDown'; key: string; delayMs?: number }
  | { kind: 'keyUp'; key: string; delayMs?: number }
  | { kind: 'text'; text: string; delayMs?: number }
  | { kind: 'wait'; delayMs: number }
  | { kind: 'combo'; keys: string[]; delayMs?: number }; // e.g., ['ctrl','v']

// Mapping remains the same structure at the top level
// mapping[giftNameLower] = Action
```

Notes:
- delayMs is applied before executing that step. For a pure wait, use kind: 'wait'.
- Keys use node-key-sender names (lowercase), e.g., 'enter', 'space', 'a', 'left', 'right', 'up', 'down'.

---

## Execution Engine (Backend)

We’ll use `node-key-sender` batch API so the whole sequence executes smoothly with precise delays.

Available functions (confirmed):
- `startBatch()`, `batchTypeKey(key, waitMs, event)`, `batchTypeText(text /*, waitMs?*/)`
- `BATCH_EVENT_KEY_PRESS`, `BATCH_EVENT_KEY_DOWN`, `BATCH_EVENT_KEY_UP`
- `batchTypeCombination(keys[], waitMs)`, `sendBatch()`
- Also `sendText(text)` in non-batch mode (fallback)

### Translation rules
```ts
switch (step.kind) {
  case 'keyTap':
    sender.batchTypeKey(step.key, step.delayMs || 0, sender.BATCH_EVENT_KEY_PRESS);
    break;
  case 'keyDown':
    sender.batchTypeKey(step.key, step.delayMs || 0, sender.BATCH_EVENT_KEY_DOWN);
    break;
  case 'keyUp':
    sender.batchTypeKey(step.key, step.delayMs || 0, sender.BATCH_EVENT_KEY_UP);
    break;
  case 'text':
    // Prefer batchTypeText if available; otherwise split outside batch with sendText
    if (typeof sender.batchTypeText === 'function') {
      sender.batchTypeText(step.text, step.delayMs || 0);
    } else {
      // Fallback: end current batch, await send, then restart batch
      // (Documented in Implementation Notes section)
    }
    break;
  case 'wait':
    // Represent a pure wait as a no-op key with wait, using a benign key like 'enter' with 0 event? Not ideal.
    // Better: attach delay to the next real step. Frontend will emit waits by pushing delayMs into the next step.
    // Implementation: skip here; delay is accumulated on next step.
    break;
  case 'combo':
    if (typeof sender.batchTypeCombination === 'function') {
      sender.batchTypeCombination(step.keys, step.delayMs || 0);
    } else {
      // Fallback: keyDown each, then keyUp in reverse (see Implementation Notes)
    }
    break;
}
```

### Execution flow
- For `type === 'press'`: keep existing logic (batch down + up or the current duration hold approach).
- For `type === 'sequence'`:
  1. `sender.startBatch()`
  2. Translate each step and add to batch
  3. `await sender.sendBatch()`

### Example: Rocket League “gg”
```json
{
  "type": "sequence",
  "steps": [
    { "kind": "keyTap", "key": "t", "delayMs": 0 }, ## t opens open game chat
    { "kind": "text",   "text": "gg",  "delayMs": 30 },
    { "kind": "keyTap", "key": "enter", "delayMs": 30 }
  ]
}
```

---

## Frontend UI Changes

- Mapping table: add an Action Type switch per mapping (“Press” vs “Sequence”).
- When “Sequence” is selected, show a sequence editor:
  - List of steps (virtualized if needed)
  - Per step: dropdown for kind, inputs for key(s)/text, delayMs
  - Buttons: Add Step, Duplicate, Remove, Move Up/Down
  - Validate keys against a known list (or allow freeform with help text)
- Test button: sends `{ type: 'test-gift', giftName }` to backend (backend executes current mapping)

Persisting:
- Continue to save entire `mapping` in localStorage and sync to backend via WebSocket on change.

---

## Compatibility & Migration

- Existing simple mappings keep working. Backend detects action.type.
- Frontend default for new rows: `type: 'press'`.
- Validation: enforce max steps (e.g., 50), max text length (e.g., 120), and total estimated duration cap.

---

## Reliability & Safety

- Queue executions to prevent overlap: implement a simple promise queue per incoming gift to serialize sequences, or a global queue if desired.
- Admin/privileged mode: some games may require elevated privileges for synthetic input; document in troubleshooting.
- Sanitization: strip non-printable characters from text steps before sending.

---

## Implementation Notes / Fallbacks

- If `batchTypeText(text, waitMs)` is not available in your installed version:
  - End current batch: `await sender.sendBatch()`
  - Send text: `await sender.sendText(text)`
  - Restart batch: `sender.startBatch()` and continue
- If `batchTypeCombination` is missing:
  - Emulate combo: for keys K1..Kn → keyDown(K1..Kn), then keyUp(Kn..K1), with an optional delay before the first down
- Wait steps:
  - Prefer modeling waits as `delayMs` on the subsequent real step.
  - For explicit waits between text and key, end batch → `await new Promise(r => setTimeout(r, ms))` → restart batch.

---

## Test Plan

1. Notepad
   - Map “GG” gift to the sequence above
   - Focus Notepad, trigger Test → should see: open new line, `gg`, new line
2. Rocket League (training/free play)
   - Trigger during match: chat opens, `gg` typed, chat closes
3. Edge cases
   - Rapid duplicate gifts (streak): ensure queueing doesn’t interleave sequences
   - Long text: enforce max length and verify truncation behavior
   - Combos: map gift to `ctrl+v` paste sequence and verify

---

## Acceptance Criteria
- Users can configure and save sequences per gift.
- Backend executes sequences reliably using batch API.
- Sequence performs “Enter → gg → Enter” correctly in Notepad and Rocket League.
- No UI freezes; live feed remains responsive while sequences run.


