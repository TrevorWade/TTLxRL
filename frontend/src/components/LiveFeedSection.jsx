import { useRef } from 'react';
import LikeCounter from './LikeCounter';

/**
 * LiveFeedSection displays the live TikTok gift feed with chat overlay styling
 * Right side of the split view layout
 * Features: Live feed cards and like counter display
 */
export default function LiveFeedSection({ 
  aggregatedFeed, 
  totalLikes, 
  connectionStatus,
  connectedUsername,
  isLive
}) {
  const feedRef = useRef(null);

  return (
    <section className="lg:col-span-2 bg-tiktok-black border-l border-tiktok-cyan/30 flex flex-col">
      {/* Live Feed Header with Like Counter */}
      <div className="p-6 pb-4 border-b border-tiktok-gray">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-tiktok-white">Live Feed</h2>
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' && connectedUsername && (
              <span className="text-xs text-gray-400">@{connectedUsername}</span>
            )}
            <div 
              className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' 
                  ? isLive 
                    ? 'bg-green-400 animate-pulse' 
                    : 'bg-yellow-400'
                  : 'bg-gray-500'
              }`} 
              title={
                connectionStatus === 'connected' 
                  ? isLive 
                    ? 'Live' 
                    : 'Connected (not live)'
                  : 'Disconnected'
              }
            ></div>
          </div>
        </div>
        <LikeCounter totalLikes={totalLikes} />
      </div>

      {/* Live Feed Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Feed Stream */}
        <div 
          ref={feedRef} 
          className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-tiktok-cyan/50"
        >
          {aggregatedFeed.map((event) => (
            <LiveFeedCard key={event.id} event={event} />
          ))}
          {!aggregatedFeed.length && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 mb-4 bg-tiktok-gray rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0V3a1 1 0 011-1h8a1 1 0 011 1v1M7 4l1 16h8l1-16M7 4h10" />
                </svg>
              </div>
              {connectionStatus === 'connected' ? (
                <>
                  <p className="text-gray-400 text-sm">No live events yet</p>
                  <p className="text-gray-500 text-xs mt-1">Waiting for gifts from @{connectedUsername}'s stream</p>
                </>
              ) : (
                <>
                  <p className="text-gray-400 text-sm">Not connected to TikTok Live</p>
                  <p className="text-gray-500 text-xs mt-1">Connect to a TikTok username to see live activity</p>
                </>
              )}
            </div>
          )}
                 </div>
       </div>
    </section>
  );
}

/**
 * Individual live feed card component with TikTok chat styling
 * Features slide-in animation and count bump effects
 */
function LiveFeedCard({ event }) {
  return (
    <div className={`flex items-center gap-3 bg-tiktok-gray/70 backdrop-blur-sm border border-gray-600 rounded-xl p-3 hover:bg-tiktok-gray/90 transition-all duration-200 ${event.fresh ? 'slide-in-left' : ''}`}>
      {/* Gift Image */}
      {event.imageUrl ? (
        <img 
          src={event.imageUrl} 
          alt={event.gift} 
          className="w-12 h-12 rounded-lg shrink-0 object-cover border border-gray-600" 
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gray-700 shrink-0 flex items-center justify-center border border-gray-600">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
      
      {/* Event Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-tiktok-white text-sm truncate">
            {event.sender}
          </div>
          <div className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
            {new Date(event.lastTime).toLocaleTimeString()}
          </div>
        </div>
        <div className="text-gray-300 truncate text-xs mt-1">
          sent <span className="text-tiktok-cyan font-medium">"{event.gift}"</span>
        </div>
        {event.focusWarning && (
          <div className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300">
            Focus warning: Active window is not "{event.focusMessage}"
          </div>
        )}
      </div>
      
      {/* Count Badge */}
      <div className="shrink-0 flex items-center justify-center">
        <div 
          className={`bg-tiktok-red text-white font-bold text-lg px-3 py-1 rounded-full min-w-12 text-center ${event.fresh ? 'count-bump-anim' : ''}`} 
          key={`bump-${event.bumpToken}`}
        >
          ×{event.count}
        </div>
      </div>
    </div>
  );
}
