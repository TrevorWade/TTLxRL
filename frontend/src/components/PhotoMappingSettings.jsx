import { useEffect, useMemo, useState } from 'react';
import {
  setActiveGame,
  getActiveGame,
  getPhotoMap,
  assignPhoto,
  saveActiveGameToDisk,
  createGameFolder,
  openFolder,
  selectImage,
  loadGameFromDisk,
  listProfiles,
  getActiveProfile,
  setActiveProfile,
  getBaseDir,
  toFileUrl,
} from '../services/photoMappingStore.js';

/**
 * PhotoMappingSettings
 * A focused, well-documented section to manage per-game key → photo mappings.
 * - User enters a game name and saves → ensures per-game folder exists.
 * - User can open the game folder.
 * - User can assign a photo to a key (or remove it).
 * - Mappings are persisted to photo-map.json (via Electron IPC).
 *
 * Keep code simple and explicit to reduce surprises.
 */
export default function PhotoMappingSettings() {
  // Game name text field
  const [gameName, setGameName] = useState('');
  // Resolved per-game folder path (after Save)
  const [gameFolderPath, setGameFolderPath] = useState('');
  // Profile management
  const [profiles, setProfiles] = useState([]);
  const [baseDir, setBaseDir] = useState('');
  // Key field and selected image path for assignment
  const [keyInput, setKeyInput] = useState('');
  const [selectedImagePath, setSelectedImagePath] = useState('');
  // Current mapping table (object: KEY -> absolute path)
  const [mapping, setMapping] = useState({});
  // Transient status message for simple feedback
  const [status, setStatus] = useState('');
  // Diagnostics: whether the Electron bridge is available
  const [bridgeAvailable, setBridgeAvailable] = useState(false);

  // Initialize from current active game on mount
  useEffect(() => {
    try {
      // Load profiles and active selection from Electron (if available)
      Promise.all([
        getActiveProfile().catch(() => getActiveGame()),
        listProfiles().catch(() => []),
        getBaseDir().catch(() => ''),
      ]).then(async ([active, list, base]) => {
        setBridgeAvailable(!!base);
        setProfiles(Array.isArray(list) ? list : []);
        setBaseDir(base || '');
        const name = active || getActiveGame();
        if (name) {
          setGameName(name);
          await loadGameFromDisk(name).catch(() => {});
          setMapping(getPhotoMap());
          // Try to resolve folder path; ensure it exists to get the real path
          try {
            const folder = await createGameFolder(name);
            setGameFolderPath(folder || '');
          } catch {}
        } else {
          setMapping(getPhotoMap());
        }
      });
    } catch {
      setMapping({});
    }
  }, []);

  // Derived list for rendering (stable ordering)
  const mappingRows = useMemo(() => {
    return Object.entries(mapping)
      .map(([k, v]) => ({ key: String(k).toUpperCase(), path: String(v) }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [mapping]);

  function showStatus(message) {
    setStatus(message);
    setTimeout(() => setStatus(''), 3000);
  }

  async function handleSaveGame() {
    const name = (gameName || '').trim();
    if (!name) {
      showStatus('Enter a game name first');
      return;
    }
    try {
      // Ensure folder, set active, and load existing mapping
      const folder = await createGameFolder(name);
      await setActiveProfile(name);
      setActiveGame(name);
      await loadGameFromDisk(name);
      setMapping(getPhotoMap());
      setGameFolderPath(folder || '');
      // Refresh profile list after creation
      try { setProfiles(await listProfiles()); } catch {}
      showStatus('Game saved. Folder created if needed.');
    } catch (e) {
      showStatus('Failed to save game setup');
      console.error(e);
    }
  }

  async function handleOpenFolder() {
    if (!gameFolderPath) {
      showStatus('No folder yet. Click Save first.');
      return;
    }
    try {
      await openFolder(gameFolderPath);
    } catch (e) {
      showStatus('Failed to open folder');
      console.error(e);
    }
  }

  async function handleSelectProfile(e) {
    const name = e.target.value;
    setGameName(name);
    try {
      await setActiveProfile(name);
      await loadGameFromDisk(name);
      setMapping(getPhotoMap());
      const folder = await createGameFolder(name); // ensure exists and get path
      setGameFolderPath(folder || '');
      showStatus('Profile loaded');
    } catch (err) {
      console.error(err);
      showStatus('Failed to switch profile');
    }
  }

  async function handleChooseImage() {
    try {
      const path = await selectImage();
      if (path) setSelectedImagePath(path);
    } catch (e) {
      showStatus('Image selection canceled or failed');
      console.error(e);
    }
  }

  async function handleAssign() {
    const k = (keyInput || '').trim().toUpperCase();
    if (!k) {
      showStatus('Enter a key');
      return;
    }
    if (!selectedImagePath) {
      showStatus('Choose an image');
      return;
    }
    try {
      assignPhoto(k, selectedImagePath);
      await saveActiveGameToDisk();
      setMapping(getPhotoMap());
      // Notify overlay window to reload photo-map.json for current profile
      try {
        const bc = new BroadcastChannel('ttlrl-overlay');
        bc.postMessage({ type: 'photoMapUpdated', profile: gameName });
        bc.close();
      } catch {}
      showStatus(`Assigned ${k}`);
    } catch (e) {
      showStatus('Failed to assign');
      console.error(e);
    }
  }

  async function handleDelete(key) {
    try {
      assignPhoto(key, null);
      await saveActiveGameToDisk();
      setMapping(getPhotoMap());
      showStatus(`Removed ${key}`);
    } catch (e) {
      showStatus('Failed to remove');
      console.error(e);
    }
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div>
        <h3 className="text-lg font-medium text-tiktok-white">Photo Mapping</h3>
        <p className="text-sm text-gray-400">Assign photos to keys for a specific game.</p>
      </div>

      {/* Game setup */}
      <div className="p-4 bg-tiktok-gray/30 rounded-lg border border-tiktok-gray space-y-3">
        {/* Diagnostics banner */}
        {!bridgeAvailable && (
          <div className="p-2 rounded bg-yellow-900/30 border border-yellow-700 text-yellow-200 text-sm">
            Electron bridge unavailable. Please run the Electron app, not just the browser dev server.
          </div>
        )}
        <div className="flex gap-2 items-center">
          <input
            className="flex-1 bg-gray-800 border border-gray-600 px-3 py-2 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
            placeholder="Game name (e.g., Rocket League)"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
          />
          <button
            onClick={handleSaveGame}
            className="px-3 py-2 bg-tiktok-cyan hover:bg-tiktok-cyan/80 text-black font-medium rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
        {/* Profile selector */}
        {profiles && profiles.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={gameName}
              onChange={handleSelectProfile}
              className="bg-gray-800 border border-gray-600 px-3 py-2 rounded-lg text-white focus:border-tiktok-cyan focus:outline-none"
            >
              {profiles.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <span className="text-sm text-gray-400">Profiles</span>
          </div>
        )}
        {(gameFolderPath || baseDir) && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">
              Base: <span className="text-gray-400">{baseDir || 'unknown'}</span>
            </span>
            <button
              onClick={handleOpenFolder}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Open Game Folder
            </button>
          </div>
        )}
      </div>

      {/* Assign mapping */}
      <div className="p-4 bg-tiktok-gray/30 rounded-lg border border-tiktok-gray">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <input
            className="sm:w-28 bg-gray-800 border border-gray-600 px-3 py-2 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
            placeholder="Key (e.g., W)"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            maxLength={16}
          />
          <div className="flex-1 flex items-center gap-2">
            <input
              className="flex-1 bg-gray-800 border border-gray-600 px-3 py-2 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
              placeholder="Selected image path"
              value={selectedImagePath}
              onChange={(e) => setSelectedImagePath(e.target.value)}
            />
            <button
              onClick={handleChooseImage}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Choose Image
            </button>
          </div>
          <button
            onClick={handleAssign}
            className="px-3 py-2 bg-tiktok-cyan hover:bg-tiktok-cyan/80 text-black font-medium rounded-lg transition-colors"
          >
            Assign
          </button>
        </div>
        {status && <div className="text-sm text-gray-300 mt-2">{status}</div>}
      </div>

      {/* Mapping table */}
      <div className="p-4 bg-tiktok-gray/30 rounded-lg border border-tiktok-gray">
        <h4 className="text-tiktok-white font-medium mb-3">Current Mappings</h4>
        {mappingRows.length === 0 ? (
          <div className="text-sm text-gray-400">No mappings yet</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {mappingRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center">
                    {/* Render thumbnail preview with fallback */}
                    <img
                      src={toFileUrl(row.path)}
                      alt={row.key}
                      className="w-7 h-7 object-contain rounded-sm border border-gray-500 bg-black/30"
                      onError={(e) => {
                        try { showStatus(`Preview unavailable for ${row.key}`); } catch {}
                        // If the image fails to load, show a simple key letter fallback
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent && !parent.querySelector('.thumb-fallback')) {
                          const el = document.createElement('div');
                          el.className = 'thumb-fallback w-7 h-7 rounded-sm border border-gray-500 bg-black/50 text-gray-200 text-xs flex items-center justify-center';
                          el.textContent = row.key.slice(0, 2);
                          parent.appendChild(el);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-white font-medium">{row.key}</div>
                    <div className="text-xs text-gray-400 break-all max-w-[38ch] sm:max-w-none">{row.path}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(row.key)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                  title="Remove mapping"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


