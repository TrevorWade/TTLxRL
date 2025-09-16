## Stream Overlay UI and Photo-based Key Mapping — Implementation Plan

### Goals
- Add a new UI button (left of `Clear`) to toggle a stream-friendly overlay.
- Overlay shows a compact, readable view of active mappings and triggers.
- Support photo-based key representations; fall back to letters when no photo exists.
- Provide a Settings → Photo Mapping workflow to assign images to keys, per game.
- Create and open per-game photo folders; allow image selection from anywhere.

---

### 1) Where to add the new UI button
- File: `frontend/src/components/GlobalControlBar.jsx`
- Location: next to the existing `Clear` button (left side). The `Clear` control appears around the block titled "Clear Profile Button".
- Action: Insert a new button component just before the `Clear` button. The button will toggle the overlay on/off.
- Button label/tooltips:
  - Title: "Stream Overlay"; tooltip: "Show stream overlay of mappings and triggers".
  - Use a small monitor/camera icon (inline SVG) for compactness.

State handling options (pick simplest):
- Add a top-level `OverlayContext` in `App.jsx` that exposes `isOverlayOpen` and `toggleOverlay()`.
- The button calls `toggleOverlay()`; the overlay component subscribes to `isOverlayOpen`.

Deliverables:
- `OverlayContext` in `src/context/OverlayContext.jsx` (or add to an existing UI context if present).
- Button added inside `GlobalControlBar.jsx`.

---

### 2) Overlay component
- File: `frontend/src/components/StreamOverlay.jsx` (new)
- Mount point: render near the top of `App.jsx` so it can overlay the entire app using fixed positioning and very high z-index.
- Visual style:
  - Semi-transparent dark background panel; white text for readability on streams.
  - Large, clear rows with minimal chrome; responsive font sizes.
  - Two sections (if both features are used):
    - Gifts → list like: `Rose = W 1s`
    - Like triggers → list like: `100 Likes = SHIFT 0.5s`
  - If a key has a mapped photo, show the image instead of the letter. Otherwise show the letter.

Data sources:
- Gifts: reuse existing gift → action mapping state used by `GiftMappingTable` and `MappingSection`.
- Like triggers: reuse state used by `LikeTriggerList` / `LikeTriggerPanel`.
- Photo key map: read via a small service (see Section 4) that returns the resolved per-game key → photo mapping.

Rendering logic:
1) For each mapped entry, compute a display payload `{label, key, durationMs}`.
2) Convert `durationMs` to human-friendly seconds (e.g., `1000 → 1s`).
3) For the `key`, attempt `photoForKey(key)`; if present, render `<img />` thumbnail; else render the letter.
4) Keep layout stable (fixed row height) so the overlay looks clean on stream.

Controls:
- Top-right close `×` inside the overlay (calls `toggleOverlay()`).
- The new toolbar button toggles it as well.

---

### 3) Photo-based key mapping model
- Data shape (per game):
```json
{
  "gameName": "Rocket League",
  "keys": {
    "W": "C:/Users/<you>/AppData/Roaming/ttl-rl/photos/Rocket League/W.png",
    "A": ".../A.png"
  }
}
```

- A small resolver returns a pure object map `{ [key: string]: absolutePath }` for the active game.
- Fallback: if no entry for `key`, render the letter.

---

### 4) Persistence and file locations (Backend-first, Electron-safe)
- Backend-first approach:
  - Prefer creating and managing profile folders via the Node backend to avoid renderer/electron permission quirks and relative-path issues.
  - Renderer calls the backend REST API (Section 4.2). If the backend is unavailable, fall back to Electron IPC (Section 4.3).

- Backend base directory:
  - `<repo>/backend/data/photos/<ProfileName>/` (sanitized profile name). This keeps assets under our control and avoids protected OS folders.
  - The backend returns absolute paths to the renderer for display/debugging, but the renderer stores only the paths returned by the backend.

- Electron fallback base directory (when backend not reachable):
  - `app.getPath('userData')/photos/<ProfileName>/` (portable across OS; on Windows this resolves into `%APPDATA%`).
  - During development, the existing repo `photos/` can still be used if explicitly chosen, but production should favor backend or `userData`.

- Files written per profile:
  - `photo-map.json` inside the profile folder.
  - Image files may live anywhere (we store absolute paths in JSON), but we recommend copying images into the profile folder for portability.

#### 4.1) Folder creation rules (applies to backend and IPC fallback)
- Sanitize profile name to a safe folder name (strip path-invalid characters, trim whitespace, collapse sequences).
- Always use absolute paths; never rely on the process CWD.
- Create parent directories with recursive mkdir; do not fail if the folder already exists.
- If a file exists at the target folder path, return a structured error instructing the user to rename the profile.
- Log the attempted path and the exact error when creation fails to aid debugging.

#### 4.2) Backend REST API (preferred)
- Endpoints (under `/api/photo-map`):
  - `GET /base-dir` → returns the absolute base directory used by the backend.
  - `GET /profiles` → returns list of existing profiles.
  - `POST /profiles` body: `{ name: string }` → creates (or ensures) `<base>/<sanitizedName>/`, returns `{ name, sanitizedName, absPath }`.
  - `GET /active` → returns `{ name?: string }` from server-side `_profiles.json`.
  - `POST /active` body: `{ name: string }` → sets active profile in `_profiles.json` (created if missing).
  - `GET /mapping/:name` → returns `{ keys: Record<string,string> }` from `photo-map.json` if it exists, else `{}`.
  - `POST /mapping/:name` body: `{ keys: Record<string,string> }` → writes pretty `photo-map.json` under the profile folder.

- Implementation notes:
  - Use `fs.mkdir`/`fs.promises.mkdir` with `{ recursive: true }` and ignore `EEXIST`.
  - Use `path.join(baseDir, sanitizedName)`; never concatenate strings directly (Windows path safety).
  - Validate name after sanitization is non-empty and <= 64 chars; reject otherwise with a clear message.
  - Store `_profiles.json` at `<baseDir>/_profiles.json` with `{ active: string }`.

#### 4.3) Electron IPC fallback (when backend unavailable)
- Add IPC channels in `frontend/electron/main.js`:
  - `photoMap:createGameFolder` → ensures a per-profile folder exists and returns its absolute path.
  - `photoMap:openFolder` → opens Explorer at a path.
  - `photoMap:selectImage` → opens a file dialog to choose an image (PNG/JPG/GIF/WebP), returns chosen absolute path.
  - `photoMap:saveMapping` → saves the per-profile JSON mapping.
  - `photoMap:loadMapping` → loads and returns mapping for the active profile.
  - `photoMap:listProfiles`, `photoMap:getBaseDir`, `photoMap:getActiveProfile`, `photoMap:setActiveProfile` to mirror backend features.

---

### 5) Settings → Photo Mapping UI
- File: `frontend/src/components/Settings.jsx` (extend existing)
- Add a new section/card titled "Photo Mapping" with:
  - Text input: `Profile name` (formerly `Game name`).
  - Button: `Save` → calls Backend `POST /api/photo-map/profiles` to create/ensure the folder, then `POST /api/photo-map/active` to set it active; shows the returned absolute path.
  - After save, add a persistent "profile button" (chip) with that name in a row of profiles for quick selection.
  - Info text after save: "Recommended: Keep photos here" with a small path readout.
  - Button: `Open Profile Folder` → opens the created folder (backend or IPC fallback).
  - Profile selection controls:
    - A horizontal list of profile chips; clicking a chip sets active profile immediately and reloads mapping.
    - A dropdown mirror for accessibility/overflow.
  - Key-to-photo mapping controls:
    - Text input for `Key` (single letter or key name), normalized to uppercase.
    - Button `Choose Image` → opens file picker (backend dialog or IPC fallback) to select an image anywhere.
    - Button `Assign` → updates in-memory map and writes `photo-map.json` to the active profile folder.
  - Table/list of current mappings with the key, thumbnail, path, and a delete icon.

Validation and UX:
- Normalize keys to uppercase single characters where applicable.
- Show inline warnings for duplicate keys and missing images.
- All actions show toasts/snackbars for success/failure.
- Data loading lifecycle:
  - On mount, call `GET /api/photo-map/profiles` (or IPC fallback) to render chips.
  - Load `GET /api/photo-map/active`; if set, auto-select and load its mapping.
  - When a profile chip is clicked, set active (POST) then load mapping.

---

### 6) Integrations and usage in the overlay
- In `StreamOverlay.jsx`, import `photoForKey(key)` from `src/services/photoMappingStore.js`.
- When building display rows for gifts and like triggers, call `photoForKey(key)`.
- Render logic:
  - If `photoForKey(key)` is truthy → render an `<img src={toFileUrl(path)} />` with fixed size and alt text as the key.
  - Else render the key letter with the same footprint.
  - Implement `toFileUrl(absPath)` to convert `C:\...` to `file:///C:/...` for use in `<img src>`.

---

### 7) New/updated files (summary)
- `src/context/OverlayContext.jsx` — provides `isOverlayOpen`, `toggleOverlay`.
- `src/components/GlobalControlBar.jsx` — add the new toggle button (left of `Clear`).
- `src/components/StreamOverlay.jsx` — overlay UI.
- `src/services/photoMappingStore.js` — load/save/resolve photo maps per game, wraps IPC calls.
- `electron/main.js` — add IPC handlers for folder creation, open dialog, open folder, and JSON read/write.
- `photos/` — development-time images (optional). Runtime uses `userData/photos/<GameName>/`.

---

### 8) Contracts (renderer ↔ backend/IPCs)
Renderer-side service should try Backend first, then IPC fallback with equivalent signatures:
```js
// Backend-first
listProfiles() => Promise<string[]>
getBaseDir() => Promise<string>
getActiveProfile() => Promise<string | undefined>
setActiveProfile(name: string) => Promise<void>
createProfile(name: string) => Promise<{ name: string, sanitizedName: string, absPath: string }>
loadPhotoMap(name: string) => Promise<Record<string, string>>
savePhotoMap(name: string, map: Record<string, string>) => Promise<void>

// IPC fallback (same signatures, different transport)
```

Backend handler expectations:
- Validate inputs; sanitize names; ensure folders exist; catch and return structured errors.
- Persist `photo-map.json` with pretty formatting for human readability.
- Log attempted paths and errors server-side for diagnostics.

IPC handler expectations:
- Mirror backend behaviors and error shapes as closely as possible.

---

### 9) Acceptance criteria
- Toolbar shows a new "Stream Overlay" button to the left of `Clear`.
- Clicking the button toggles a full-app overlay with a compact list of mappings and triggers.
- Example row reads exactly like: `Rose = W 1s` (or uses the photo for `W` if assigned).
- Settings include a "Photo Mapping" card with the described controls.
- On entering a profile name and clicking `Save`, a new profile folder is created (Backend-first) under `<backend>/data/photos/<ProfileName>/` or IPC fallback under `userData/photos/<ProfileName>/`.
- A profile button (chip) with the saved name appears immediately and becomes active.
- User sees the message: "Recommended: Keep photos here" and can open the folder.
- User can assign images to keys, save, and see them applied in the overlay.
- If no photo exists for a key, the overlay shows the key letter.

---

### 10) Error handling & edge cases
- Non-existent or deleted image path → show letter and a small warning icon in Settings.
- Invalid key format → block `Assign` with a tooltip explaining valid formats.
- Profile name with path-invalid characters → sanitize and warn; use sanitized folder name.
- Missing `photo-map.json` → treat as empty; create on first save.
- Read/write failures → show actionable message and the failing path.
- Handle common failure causes explicitly:
  - Permissions: avoid protected directories; use backend-managed base or `userData`.
  - Incorrect/relative paths: always log and display absolute paths; never rely on CWD.
  - Folder already exists: do not treat as error; ensure idempotent creation.
  - File vs. folder conflicts: detect and surface clear remediation.
  - Environment restrictions: if backend or IPC is unavailable, display a non-blocking warning explaining the limitation.

---

## 10.1) Reported issues and remediation plan

### A) Issues observed (from user test)
- Folder was not created when saving a mapping/profile.
- No persistent profiles in Settings to switch between later.
- Choose Image button did nothing (no OS file dialog).
- Manually typed absolute path did not render the correct image thumbnail.

### B) Likely root causes
- Renderer captured `window.photoMap` as `null` at import time; IPC never executed. Fix: resolve the Electron bridge dynamically per call.
- `<img src>` was fed raw Windows paths instead of `file://` URLs; browsers require `file:///C:/...` format.
- Profiles are in-memory only; no persisted profile list or active-profile tracking.
- Save flow doesn’t surface base directory and can silently no-op if the bridge is missing.
- Folder creation attempted from the renderer with relative/malformed paths and without recursive mkdir.
- Permissions/antivirus blocking writes to protected directories.

### C) Detailed plan to fix
1) Backend-first folder/profile management
   - Implement REST endpoints (Section 4.2) with sanitization, absolute paths, and recursive mkdir.
   - Persist `_profiles.json` with the active profile and expose GET/POST to read/set it.
   - Return `{ name, sanitizedName, absPath }` on creation; renderer shows path and adds a profile chip.

2) Electron bridge reliability [DONE]
   - Use `getBridge()` in `photoMappingStore` to resolve the Electron bridge at call time.

3) Visible profiles and activation
   - On Save: `POST /profiles` → `POST /active` → refresh `GET /profiles`.
   - Render a profile chip immediately for the saved name; clicking chips switches active profile.

4) Dialog and image selection
   - Ensure platform dialog opens with image filters (Backend or IPC fallback).
   - If neither available, show a clear inline warning.

5) Correct image rendering from absolute paths
   - Implement `toFileUrl(absPath)`; use only for `<img src>`; keep native absolute paths in JSON.
   - Validate file existence on assign and warn if missing.

6) Diagnostics and failure causes
   - Log exact errors and full attempted paths (backend and IPC).
   - Avoid protected directories; ensure absolute paths; mkdir recursive and idempotent.

### D) Acceptance criteria
- Save creates `<backend>/data/photos/<ProfileName>/` (or IPC fallback) and sets it active; the exact folder path is shown.
- A profile button (chip) with the saved name appears; selecting it later reloads that profile.
- Profiles list shows existing profiles; selecting one loads its mappings instantly.
- Choose Image opens the OS dialog; selected path fills the input; Assign writes to `photo-map.json`.
- Thumbnails render for valid images chosen via dialog or pasted paths (using `file://` URLs).

### E) Test checklist (focused on issues)
- Dev and packaged builds both create and read from the expected base dir.
- Switching profiles updates the mapping view immediately.
- Dialog allows choosing images outside the base dir.
- Broken/missing image shows a warning and falls back to letter rendering.

---

### 11) Testing checklist
Manual tests:
- Toggle overlay on/off from toolbar and from overlay close `×`.
- Verify gifts and like triggers render as readable rows; durations display as `Ns`.
- Create game `Rocket League`, open folder, confirm path exists.
- Assign a photo for `W`; verify overlay shows the photo; remove/rename file to test fallback.
- Assign multiple keys and confirm all render; delete one mapping and verify removal.

Smoke tests (dev):
- Windows path handling with spaces in game names.
- Overlay performance with 50+ rows.
- Verify packaged app can read/write inside `userData`.

---

### 12) Effort estimate (rough)
- Toolbar button + context wiring: 0.5 day
- Overlay UI (read-only) + integration: 0.5–1 day
- Settings Photo Mapping UI: 1 day
- Electron IPC + persistence: 0.5 day
- QA and fixes: 0.5 day

Total: ~2.5–3.5 days

---

### 13) Rollout notes
- Ship behind a simple UI toggle; no breaking changes to existing mappings.
- If desired, include a `Reset Photo Map` button in Settings to clear `photo-map.json` for the active game.


