// Photo Mapping Store (Model only)
// Step 3 of the plan: implement a per-game, in-memory model for key → photo mapping.
// Persistence and Electron IPC will be added in step 4/5; for now this file is a pure
// front-end state holder with clear, documented behavior.

// In-memory structure:
// - activeGameName: current logical game context
// - gameNameToMap: { [sanitizedGameName]: { [UPPER_KEY]: absolutePath } }

const DEFAULT_GAME = 'default';
let activeGameName = DEFAULT_GAME;
const gameNameToMap = Object.create(null);
gameNameToMap[DEFAULT_GAME] = Object.create(null);

// Optional Electron bridge (undefined when running in plain browser)
// IMPORTANT: Resolve the bridge dynamically each time to avoid capturing
// `null` at module initialization before the preload script exposes it.
function getBridge() {
  // When running under Electron with contextIsolation enabled, the preload
  // will expose a safe API at window.photoMap via contextBridge.
  return (typeof window !== 'undefined' && window.photoMap) ? window.photoMap : null;
}

// Utility: normalize and sanitize
function normalizeKey(raw) {
  // Convert to simple uppercase string keys like "W", "A", "SHIFT"
  return String(raw || '').trim().toUpperCase();
}

function sanitizeGameName(name) {
  // Keep it simple for model-only: trim and collapse whitespace.
  // Step 4 will handle filesystem-safe names.
  const n = String(name || '').trim();
  return n || DEFAULT_GAME;
}

function ensureGame(name) {
  const g = sanitizeGameName(name);
  if (!gameNameToMap[g]) gameNameToMap[g] = Object.create(null);
  return g;
}

// Public API — Model only

/**
 * Sets the active game context (model only). Does not touch disk.
 */
export function setActiveGame(name) {
  activeGameName = ensureGame(name);
}

/**
 * Gets the current active game name.
 */
export function getActiveGame() {
  return activeGameName;
}

/**
 * Assigns (or removes) a photo for a key in the active game.
 * - If absolutePath is falsy, the key mapping is removed.
 */
export function assignPhoto(key, absolutePath) {
  const k = normalizeKey(key);
  if (!k) return;
  const map = gameNameToMap[ensureGame(activeGameName)];
  if (!absolutePath) {
    delete map[k];
  } else {
    map[k] = String(absolutePath);
  }
}

/**
 * Returns an absolute image path for a key (if mapped for the active game), otherwise null.
 */
export function photoForKey(key) {
  const k = normalizeKey(key);
  if (!k) return null;
  const map = gameNameToMap[ensureGame(activeGameName)];
  return map[k] || null;
}

/**
 * Returns a shallow copy of the active game's key → photo map.
 */
export function getPhotoMap() {
  const map = gameNameToMap[ensureGame(activeGameName)];
  return { ...map };
}

/**
 * Replaces the active game's map with the provided mapping object.
 * Expected shape: { [UPPER_KEY]: absolutePath }
 */
export function setPhotoMap(nextMap) {
  const map = Object.create(null);
  if (nextMap && typeof nextMap === 'object') {
    for (const [k, v] of Object.entries(nextMap)) {
      const key = normalizeKey(k);
      if (key && v) map[key] = String(v);
    }
  }
  gameNameToMap[ensureGame(activeGameName)] = map;
}

/**
 * Returns a JSON-serializable snapshot in the data shape described by the plan.
 * Useful for saving in step 4.
 */
export function getSnapshot() {
  const keys = getPhotoMap();
  return {
    gameName: activeGameName,
    keys,
  };
}

// --- Persistence bridge (Step 4) ---

/**
 * Ensure a per-game folder exists and return its absolute path.
 */
export async function createGameFolder(gameName) {
  const bridge = getBridge();
  if (!bridge) return null;
  return await bridge.createGameFolder(sanitizeGameName(gameName));
}

/**
 * Open a folder in the OS file explorer.
 */
export async function openFolder(folderPath) {
  const bridge = getBridge();
  if (!bridge) return false;
  return await bridge.openFolder(folderPath);
}

/**
 * Show an image picker and return the absolute file path (or null if canceled).
 */
export async function selectImage() {
  const bridge = getBridge();
  if (!bridge) return null;
  return await bridge.selectImage();
}

/**
 * Save the current active game's map to disk via Electron.
 */
export async function saveActiveGameToDisk() {
  const bridge = getBridge();
  if (!bridge) return null;
  const map = getPhotoMap();
  return await bridge.saveMapping(activeGameName, map);
}

/**
 * Load a game's map from disk into memory and set it active.
 * Returns the loaded mapping.
 */
export async function loadGameFromDisk(gameName) {
  const bridge = getBridge();
  if (!bridge) return {};
  const safe = sanitizeGameName(gameName);
  const map = await bridge.loadMapping(safe);
  setActiveGame(safe);
  setPhotoMap(map || {});
  return getPhotoMap();
}

// Aliases matching the plan's IPC contract naming (step 8)
export async function savePhotoMap(gameName, map) {
  const safe = sanitizeGameName(gameName);
  setActiveGame(safe);
  setPhotoMap(map || {});
  const bridge = getBridge();
  if (!bridge) return null;
  return await bridge.saveMapping(safe, getPhotoMap());
}

export async function loadPhotoMap(gameName) {
  const bridge = getBridge();
  if (bridge) {
    const safe = sanitizeGameName(gameName);
    const loaded = await bridge.loadMapping(safe);
    setActiveGame(safe);
    setPhotoMap(loaded || {});
    return getPhotoMap();
  }
  setActiveGame(gameName);
  return getPhotoMap();
}

// --- Profiles & utilities ---
export async function getBaseDir() {
  const bridge = getBridge();
  if (!bridge) return null;
  return await bridge.getBaseDir();
}

export async function listProfiles() {
  const bridge = getBridge();
  if (!bridge) return [];
  return await bridge.listProfiles();
}

export async function getActiveProfile() {
  const bridge = getBridge();
  if (!bridge) return getActiveGame();
  return await bridge.getActiveProfile();
}

export async function setActiveProfile(name) {
  const bridge = getBridge();
  const safe = sanitizeGameName(name);
  setActiveGame(safe);
  if (!bridge) return safe;
  await bridge.setActiveProfile(safe);
  return safe;
}

// Convert native absolute path to file:// URL for <img src>
export function toFileUrl(absolutePath) {
  if (!absolutePath) return '';
  // Normalize backslashes to forward slashes and ensure prefix
  const withSlashes = String(absolutePath).replace(/\\/g, '/');
  if (withSlashes.startsWith('file://')) return withSlashes;
  // On Windows paths like C:/..., ensure triple slash prefix
  return `file:///${withSlashes.replace(/^\//, '')}`;
}


