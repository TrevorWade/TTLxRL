import { useState } from 'react';

/**
 * GlobalControlBar contains pause/resume and profile controls that persist across tabs
 * Features: Always visible controls, compact design, profile management
 */
import { useOverlay } from '../context/OverlayContext.jsx';

export default function GlobalControlBar({
  paused,
  onTogglePause,
  profiles,
  profileName,
  setProfileName,
  onSaveProfile,
  onLoadProfile,
  onDeleteProfile,
  onClearProfile
}) {
  const [showProfiles, setShowProfiles] = useState(false);
  const { toggleOverlay } = useOverlay();

  return (
    <div className="flex-shrink-0 bg-tiktok-gray/30 border-b border-gray-600 px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side - Main Controls */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onTogglePause} 
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              paused 
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                : 'bg-tiktok-red hover:bg-tiktok-pink text-white'
            }`}
          >
            <span className="text-sm">{paused ? '▶️' : '⏸️'}</span>
            <span className="hidden sm:inline">{paused ? 'Resume All' : 'Pause All'}</span>
          </button>
          
          <div className="text-gray-400 text-sm hidden md:flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Global automation controls
          </div>
        </div>

        {/* Right Side - Profile Controls */}
        <div className="flex items-center gap-2">
          {/* Stream Overlay Toggle Button (left of Clear) */}
          <button
            onClick={async () => {
              try {
                const bridge = (typeof window !== 'undefined' && window.photoMap) ? window.photoMap : null;
                if (bridge && bridge.openOverlayWindow) {
                  await bridge.openOverlayWindow();
                } else {
                  // Fallback to in-app overlay toggle if Electron bridge missing
                  toggleOverlay();
                }
              } catch {
                toggleOverlay();
              }
            }}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            title="Stream Overlay"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H9l-4 4v-4H4a1 1 0 01-1-1V4z" />
            </svg>
            <span className="hidden sm:inline">Overlay</span>
          </button>
          {/* Clear Profile Button */}
          <button
            onClick={onClearProfile}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            title="Clear current profile and mappings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1m-7 0h8" />
            </svg>
            <span className="hidden sm:inline">Clear</span>
          </button>

          <button
            onClick={() => setShowProfiles(!showProfiles)}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            title="Manage Profiles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="hidden sm:inline">Profiles</span>
          </button>

          {profileName && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-tiktok-cyan/20 border border-tiktok-cyan/50 rounded-lg">
              <svg className="w-4 h-4 text-tiktok-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-tiktok-cyan text-sm font-medium">{profileName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Profile Panel */}
      {showProfiles && (
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600 animate-fadeInUp">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Profile Management
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Save Current Configuration</label>
              <div className="flex gap-2">
                <input
                  placeholder="Profile name"
                  className="flex-1 bg-gray-800 border border-gray-600 px-3 py-2 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
                <button 
                  onClick={onSaveProfile} 
                  className="px-4 py-2 bg-tiktok-cyan hover:bg-tiktok-cyan/80 text-black font-medium rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Load Saved Profile</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-gray-800 border border-gray-600 px-3 py-2 rounded-lg text-white focus:border-tiktok-cyan focus:outline-none"
                  value={profileName || ''}
                  onChange={(e) => onLoadProfile(e.target.value)}
                >
                  <option value="">Select profile…</option>
                  {Object.keys(profiles).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button
                  onClick={() => profileName && onDeleteProfile(profileName)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  disabled={!profileName}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
