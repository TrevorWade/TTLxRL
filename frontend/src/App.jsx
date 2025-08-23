import { useEffect, useMemo, useRef, useState } from 'react';
import { connect, send } from './ws';
import MainLayout from './components/MainLayout';
import { CleanMappingSection } from './components/MappingSection';
import LiveFeedSection from './components/LiveFeedSection';
import TikTokConnection from './components/TikTokConnection';

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
  // TikTok connection state
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectedUsername, setConnectedUsername] = useState('');
  const [connectionError, setConnectionError] = useState(null);
  const [isLive, setIsLive] = useState(false);
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
        // Initialize connection state
        setConnectionStatus(msg.connectionStatus || 'disconnected');
        setConnectedUsername(msg.username || '');
        setConnectionError(msg.connectionError || null);
        setIsLive(msg.isLive || false);
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
      if (msg.type === 'connection-status') {
        setConnectionStatus(msg.status || 'disconnected');
        setConnectedUsername(msg.username || '');
        setConnectionError(msg.error || null);
        setIsLive(msg.isLive || false);
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
    console.log(`🔍 Like trigger engine running - totalLikes: ${totalLikes}, triggers: ${likeTriggers.length}`);
    
    likeTriggers.forEach((trigger, index) => {
      const multiplier = Math.floor(totalLikes / trigger.threshold);
      console.log(`🔍 Checking trigger: ${trigger.threshold} likes -> "${trigger.key}" (current: ${totalLikes}, multiplier: ${multiplier}, fired: ${trigger.firedCount})`);
      
      if (multiplier > trigger.firedCount) {
        // Fire the trigger
        console.log(`🔥 Like trigger fired: ${trigger.threshold} likes -> key "${trigger.key}" (fired ${multiplier} times)`);
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
  }, [totalLikes]); // Remove likeTriggers from dependency to prevent recreation

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
    const next = { ...mapping, [gift]: { key, durationSec: Number(durationSec) || 1.0, cooldownMs: Number(cooldownMs) || 0 } };
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
    // Reset total likes to 0
    setTotalLikes(0);
    
    // Reset all trigger fired counts to 0
    setLikeTriggers(likeTriggers.map(t => ({ ...t, firedCount: 0 })));
    
    // Send reset message to backend
    send({ type: 'reset-like-counts' });
  }

  const rows = useMemo(() => Object.entries(mapping), [mapping]);
  const aggregatedFeed = useMemo(() => feedOrder.map((k) => feedMap[k]).filter(Boolean), [feedMap, feedOrder]);

  function handleConnectionChange(status, username) {
    // Optional callback for connection state changes
    console.log(`Connection ${status} for @${username}`);
  }

  return (
    <MainLayout
      connectionStatus={connectionStatus}
      connectedUsername={connectedUsername}
      connectionError={connectionError}
      isLive={isLive}
      onConnectionChange={handleConnectionChange}
    >
      {/* Mapping Section - Left side (60% width on desktop) */}
      <CleanMappingSection
        mapping={mapping}
        setMapping={setMapping}
        profiles={profiles}
        profileName={profileName}
        setProfileName={setProfileName}
        onSaveProfile={saveCurrentAsProfile}
        onLoadProfile={loadProfile}
        onDeleteProfile={deleteProfile}
        onTestGift={testGift}
        paused={paused}
        onTogglePause={togglePause}
        totalLikes={totalLikes}
        // Like trigger props
        likeTriggers={likeTriggers}
        onAddLikeTrigger={addLikeTrigger}
        onRemoveLikeTrigger={removeLikeTrigger}
        onResetTriggerCounts={resetTriggerCounts}
      />
      
      {/* Live Feed Section - Right side (40% width on desktop) */}
      <LiveFeedSection
        aggregatedFeed={aggregatedFeed}
        totalLikes={totalLikes}
        // Connection status for display
        connectionStatus={connectionStatus}
        connectedUsername={connectedUsername}
        isLive={isLive}
      />
    </MainLayout>
  );
}




