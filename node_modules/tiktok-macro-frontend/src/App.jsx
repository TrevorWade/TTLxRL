import { useEffect, useMemo, useRef, useState } from 'react';
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
  // Like count tracking
  const [totalLikes, setTotalLikes] = useState(0);
  const [likeTriggers, setLikeTriggers] = useLocalStorage('likeTriggers', []);
  // Aggregated feed: map + order per plan
  const [feedMap, setFeedMap] = useState({}); // key -> item
  const [feedOrder, setFeedOrder] = useState([]); // array of keys, newest first
  const feedMapRef = useRef(feedMap);
  const feedOrderRef = useRef(feedOrder);
  useEffect(() => { feedMapRef.current = feedMap; }, [feedMap]);
  useEffect(() => { feedOrderRef.current = feedOrder; }, [feedOrder]);
  // Grouping window for aggregation (ms). If events arrive after this window, create a new card
  const GROUP_WINDOW_MS = 30000; // 30s
  const feedRef = useRef(null);
  const seqRef = useRef(0);

  // Profiles (saved locally, loadable any time)
  const PROFILES_KEY = 'giftMappingProfiles';
  const LAST_PROFILE_KEY = 'giftMappingLastProfile';
  const [profiles, setProfiles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
    } catch {
      return {};
    }
  });
  const [profileName, setProfileName] = useState(() => localStorage.getItem(LAST_PROFILE_KEY) || '');

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
        // Initialize total likes from backend
        if (typeof msg.totalLikes === 'number') {
          setTotalLikes(msg.totalLikes);
        }
      }
      if (msg.type === 'gift') {
        const nowTs = Number(msg.ts) || Date.now();
        const senderKey = String(msg.sender || '').trim().toLowerCase();
        const giftKey = String(msg.giftName || '').trim().toLowerCase();
        const pairKey = `${senderKey}|${giftKey}`;
        const imageUrl = msg.imageUrl || null;
        const inc = Number(msg.countInc || 1);

        // Work against refs so multiple rapid events see the latest state synchronously
        const map = { ...feedMapRef.current };
        const order = [...feedOrderRef.current];

        // Find the newest card for this pair
        let targetId = null;
        for (const id of order) {
          const item = map[id];
          if (item && item.pairKey === pairKey) {
            if (nowTs - (item.lastTime || 0) <= GROUP_WINDOW_MS) {
              targetId = id; // merge into this
            }
            break;
          }
        }

        let newIdCreated = null;
        if (targetId) {
          const existing = map[targetId];
          map[targetId] = {
            ...existing,
            imageUrl: existing.imageUrl || imageUrl,
            count: (existing.count || 1) + inc,
            lastTime: nowTs,
            bumpToken: (existing.bumpToken || 0) + 1,
          };
          // move to front
          const idx = order.indexOf(targetId);
          if (idx > -1) {
            order.splice(idx, 1);
            order.unshift(targetId);
          }
        } else {
          const seq = ++seqRef.current;
          const newId = `${pairKey}-${nowTs}-${seq}`;
          newIdCreated = newId;
          map[newId] = {
            id: newId,
            pairKey,
            sender: msg.sender,
            gift: msg.giftName,
            imageUrl,
            count: inc,
            firstTime: nowTs,
            lastTime: nowTs,
            fresh: true,
            bumpToken: 1,
          };
          order.unshift(newId);
        }

        // Trim
        while (order.length > 200) {
          const removeId = order.pop();
          delete map[removeId];
        }

        // Commit to refs and state synchronously
        feedMapRef.current = map;
        feedOrderRef.current = order;
        setFeedMap(map);
        setFeedOrder(order);

        if (newIdCreated) {
          // After animation, mark fresh=false
          const idToClear = newIdCreated;
          setTimeout(() => {
            const m = feedMapRef.current;
            const item = m[idToClear];
            if (!item || !item.fresh) return;
            const updated = { ...m, [idToClear]: { ...item, fresh: false } };
            feedMapRef.current = updated;
            setFeedMap(updated);
          }, 200);
        }

        // Keep viewport at the top so newest (top) is visible
        requestAnimationFrame(() => {
          if (feedRef.current) feedRef.current.scrollTop = 0;
        });
      }
      if (msg.type === 'like') {
        // Update total likes count
        if (typeof msg.totalLikes === 'number') {
          setTotalLikes(msg.totalLikes);
        }
      }
      if (msg.type === 'pause-updated') {
        setPaused(!!msg.paused);
      }
      if (msg.type === 'focus-warning') {
        // Surface a lightweight toast/banner in the feed
        setFeedOrder((o) => [
          `focus-${Date.now()}`,
          ...o
        ].slice(0, 200));
        setFeedMap((m) => ({
          ...m,
          [`focus-${Date.now()}`]: {
            id: `focus-${Date.now()}`,
            pairKey: 'focus-warning',
            sender: 'Focus warning',
            gift: `Active window is not "${msg.expected}"`,
            imageUrl: null,
            count: 1,
            firstTime: Date.now(),
            lastTime: Date.now(),
            fresh: true,
            bumpToken: 1,
          },
        }));
      }
    });
  }, []);

  // LikeTriggerEngine - monitors totalLikes and fires triggers
  useEffect(() => {
    likeTriggers.forEach((trigger, index) => {
      const multiplier = Math.floor(totalLikes / trigger.threshold);
      if (multiplier > trigger.firedCount) {
        // Fire the trigger
        console.log(`Like trigger fired: ${trigger.threshold} likes -> key "${trigger.key}"`);
        send({ 
          type: 'like-key', 
          key: trigger.key, 
          durationMs: trigger.durationMs 
        });
        
        // Update firedCount locally
        const updatedTriggers = [...likeTriggers];
        updatedTriggers[index] = { ...trigger, firedCount: multiplier };
        setLikeTriggers(updatedTriggers);
      }
    });
  }, [totalLikes, likeTriggers]);

  // Profiles helpers
  function persistProfiles(next) {
    setProfiles(next);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(next));
  }

  function saveCurrentAsProfile() {
    const name = profileName.trim();
    if (!name) return;
    const next = { ...profiles, [name]: mapping };
    persistProfiles(next);
    localStorage.setItem(LAST_PROFILE_KEY, name);
  }

  function loadProfile(name) {
    const data = profiles[name];
    if (!data) return;
    setProfileName(name);
    localStorage.setItem(LAST_PROFILE_KEY, name);
    setMapping(data);
  }

  function deleteProfile(name) {
    const next = { ...profiles };
    delete next[name];
    persistProfiles(next);
    if (profileName === name) {
      setProfileName('');
      localStorage.removeItem(LAST_PROFILE_KEY);
    }
  }

  function deleteAllMappings() {
    setMapping({});
  }

  function upsertMapping(giftName, key, durationSec, cooldownMs) {
    const gift = giftName.toLowerCase().trim();
    if (!gift) return;
    const next = { ...mapping, [gift]: { key, durationSec: Number(durationSec) || 0.3, cooldownMs: Number(cooldownMs) || 0 } };
    setMapping(next);
  }

  function removeMapping(giftName) {
    const gift = giftName.toLowerCase();
    const next = { ...mapping };
    delete next[gift];
    setMapping(next);
  }

  function testGift(giftName) {
    // Send a 3-second delay so you can switch to the game window
    send({ type: 'test-gift', giftName, delayMs: 3000 });
  }

  function togglePause() {
    send({ type: 'toggle-pause', paused: !paused });
  }

  // Like trigger management functions
  function addLikeTrigger(threshold, key, durationMs) {
    if (!threshold || !key) return;
    const newTrigger = {
      id: `trigger-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      threshold: Number(threshold),
      key: String(key).toLowerCase(),
      durationMs: Number(durationMs) || 300,
      firedCount: 0
    };
    setLikeTriggers([...likeTriggers, newTrigger]);
  }

  function removeLikeTrigger(id) {
    setLikeTriggers(likeTriggers.filter(t => t.id !== id));
  }

  function resetTriggerCounts() {
    setLikeTriggers(likeTriggers.map(t => ({ ...t, firedCount: 0 })));
  }

  const rows = useMemo(() => Object.entries(mapping), [mapping]);
  const aggregatedFeed = useMemo(() => feedOrder.map((k) => feedMap[k]).filter(Boolean), [feedMap, feedOrder]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <h1 className="text-2xl font-bold mb-4">TikTok Gift → Key Mapper</h1>

      <div className="flex gap-4 mb-6">
        <button onClick={togglePause} className={`px-3 py-2 rounded ${paused ? 'bg-yellow-600' : 'bg-emerald-600'}`}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <AddRow onAdd={upsertMapping} />
        <button onClick={deleteAllMappings} className="px-3 py-2 rounded bg-red-700">Delete All</button>
      </div>

      {/* Profiles */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <div className="flex gap-2 items-center">
          <input
            placeholder="Profile name"
            className="bg-slate-800 px-3 py-2 rounded w-full"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />
          <button onClick={saveCurrentAsProfile} className="px-3 py-2 bg-indigo-600 rounded whitespace-nowrap">Save Profile</button>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="bg-slate-800 px-3 py-2 rounded w-full"
            value={profileName || ''}
            onChange={(e) => loadProfile(e.target.value)}
          >
            <option value="">Select profile…</option>
            {Object.keys(profiles).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button
            onClick={() => profileName && deleteProfile(profileName)}
            className="px-3 py-2 bg-slate-700 rounded whitespace-nowrap"
          >
            Delete Profile
          </button>
        </div>
      </div>

      <table className="w-full text-left mb-8">
        <thead>
          <tr className="text-slate-300">
            <th className="py-2">Gift name</th>
            <th className="py-2">Key</th>
            <th className="py-2">Duration (sec)</th>
            <th className="py-2">Cooldown (ms)</th>
            <th className="py-2">Test</th>
            <th className="py-2">Remove</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([gift, cfg]) => (
            <tr key={gift} className="border-t border-slate-700">
              <td className="py-2">{gift}</td>
              <td className="py-2">{cfg.key}</td>
              <td className="py-2">{cfg.durationSec ?? (cfg.durationMs ? (cfg.durationMs/1000) : 0)}</td>
              <td className="py-2">{cfg.cooldownMs ?? 0}</td>
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
      {/* Like Counter Display */}
      <div className="mb-4 p-4 bg-slate-800 rounded-lg border border-slate-600">
        <div className="flex items-center gap-4">
          <div className="text-3xl">❤️</div>
          <div>
            <div className="text-sm text-slate-400">Total Likes</div>
            <div className="text-4xl font-bold text-red-400">{totalLikes.toLocaleString()}</div>
          </div>
        </div>
      </div>
      
      <div ref={feedRef} className="max-h-96 overflow-y-auto pr-3 space-y-2 w-full max-w-2xl">
        {aggregatedFeed.map((e) => (
          <div key={e.id} className={`flex items-center gap-3 bg-slate-800/70 border border-slate-700 rounded-lg p-3 ${e.fresh ? 'slide-in-left' : ''}`}>
            {e.imageUrl ? (
              <img src={e.imageUrl} alt={e.gift} className="w-12 h-12 rounded-lg shrink-0 object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-700 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-100 text-base truncate">{e.sender}</div>
                <div className="text-xs text-slate-400 tabular-nums whitespace-nowrap">{new Date(e.lastTime).toLocaleTimeString()}</div>
              </div>
              <div className="text-slate-200 truncate text-sm">sent “{e.gift}”</div>
            </div>
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              <div className={`text-indigo-400 font-bold tabular-nums leading-none ${'count-bump-anim'} text-2xl`} key={`bump-${e.bumpToken}`}>
                ×{e.count}
              </div>
            </div>
          </div>
        ))}
        {!aggregatedFeed.length && (
          <div className="text-slate-400 text-sm">No events yet. Go live and send a gift to see activity.</div>
        )}
      </div>

      {/* Like Triggers Management */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Like Triggers</h2>
        
        {/* Add New Trigger */}
        <div className="mb-6">
          <AddLikeTrigger onAdd={addLikeTrigger} />
        </div>

        {/* Trigger Controls */}
        <div className="mb-4 flex gap-2">
          <button 
            onClick={resetTriggerCounts}
            className="px-3 py-2 bg-yellow-600 rounded"
          >
            Reset All Counts
          </button>
        </div>

        {/* Triggers List */}
        <div className="space-y-2 max-w-4xl">
          {likeTriggers.map((trigger) => (
            <div key={trigger.id} className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg border border-slate-600">
              <div className="flex-1">
                <div className="text-sm text-slate-400">Every {trigger.threshold.toLocaleString()} likes</div>
                <div className="text-lg">Press "{trigger.key}" for {trigger.durationMs}ms</div>
                <div className="text-xs text-slate-500">
                  Fired {trigger.firedCount}× 
                  {trigger.firedCount > 0 && ` (last: ${(trigger.firedCount * trigger.threshold).toLocaleString()} likes)`}
                </div>
              </div>
              <button
                onClick={() => removeLikeTrigger(trigger.id)}
                className="px-3 py-2 bg-red-600 rounded"
              >
                Remove
              </button>
            </div>
          ))}
          {!likeTriggers.length && (
            <div className="text-slate-400 text-sm">No like triggers configured. Add one above.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddLikeTrigger({ onAdd }) {
  const [threshold, setThreshold] = useState(100);
  const [key, setKey] = useState('a');
  const [durationMs, setDurationMs] = useState(300);

  const handleSubmit = () => {
    onAdd(threshold, key, durationMs);
    setThreshold(100);
    setKey('a');
    setDurationMs(300);
  };

  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm text-slate-400">Every</span>
      <input
        type="number"
        min="1"
        placeholder="Threshold (e.g., 100)"
        className="bg-slate-800 px-3 py-2 rounded w-32"
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
      />
      <span className="text-sm text-slate-400">likes, press</span>
      <input
        placeholder="Key (e.g., a)"
        className="bg-slate-800 px-3 py-2 rounded w-16"
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      <span className="text-sm text-slate-400">for</span>
      <input
        type="number"
        min="0"
        placeholder="Duration (ms)"
        className="bg-slate-800 px-3 py-2 rounded w-24"
        value={durationMs}
        onChange={(e) => setDurationMs(Number(e.target.value))}
      />
      <span className="text-sm text-slate-400">ms</span>
      <button
        onClick={handleSubmit}
        className="px-4 py-2 bg-indigo-600 rounded"
      >
        Add Trigger
      </button>
    </div>
  );
}

function AddRow({ onAdd }) {
  const [gift, setGift] = useState('');
  const [key, setKey] = useState('a');
  const [durationSec, setDurationSec] = useState(0.3);
  const [cooldown, setCooldown] = useState(0);

  return (
    <div className="flex gap-2">
      <input
        list="tiktok-gifts"
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
        step="0.1"
        min="0"
        placeholder="Duration (sec)"
        className="bg-slate-800 px-3 py-2 rounded w-40"
        value={durationSec}
        onChange={(e) => setDurationSec(e.target.value)}
      />
      <input
        type="number"
        placeholder="Cooldown (ms)"
        className="bg-slate-800 px-3 py-2 rounded w-40"
        value={cooldown}
        onChange={(e) => setCooldown(e.target.value)}
      />
      <button
        onClick={() => onAdd(gift, key, durationSec, cooldown)}
        className="px-3 py-2 bg-indigo-600 rounded"
      >
        Add / Update
      </button>
      <datalist id="tiktok-gifts">
        <option value="Star" />
        <option value="Rose" />
        <option value="Let 'Em Cook" />
        <option value="GG" />
        <option value="Game Controller" />
        <option value="Heart Superstage" />
        <option value="Heart Stage" />
        <option value="Heart It Out" />
        <option value="iHeart You" />
        <option value="Golden Gamepad" />
        <option value="I'm New Here" />
        <option value="Hi Friend" />
      </datalist>
    </div>
  );
}


