import { useState, useEffect } from 'react';
import { send } from '../ws';

/**
 * Compact TikTok connection component for the header
 * Features: Small username input, status indicators, connect/disconnect
 */
export default function CompactTikTokConnection({ 
  connectionStatus = 'disconnected', 
  username = '', 
  connectionError = null,
  isLive = false,
  onConnectionChange 
}) {
  const [inputUsername, setInputUsername] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Update input when username changes externally
  useEffect(() => {
    if (username && !inputUsername) {
      setInputUsername(username);
    }
  }, [username, inputUsername]);

  // Update connecting state based on connection status
  useEffect(() => {
    setIsConnecting(connectionStatus === 'connecting');
  }, [connectionStatus]);

  const handleConnect = async () => {
    const cleanUsername = inputUsername.replace('@', '').trim();
    if (!cleanUsername) return;
    
    setIsConnecting(true);
    
    try {
      send({ 
        type: 'connect-tiktok', 
        username: cleanUsername 
      });
      
      if (onConnectionChange) {
        onConnectionChange('connecting', cleanUsername);
      }
    } catch (error) {
      console.error('Failed to send connect message:', error);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    try {
      send({ type: 'disconnect-tiktok' });
      
      if (onConnectionChange) {
        onConnectionChange('disconnecting', username);
      }
    } catch (error) {
      console.error('Failed to send disconnect message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

  const getStatusColor = () => {
    if (connectionStatus === 'connected') {
      return isLive ? 'bg-green-400' : 'bg-yellow-400';
    }
    switch (connectionStatus) {
      case 'connecting': return 'bg-yellow-400';
      case 'error': return 'bg-red-400';
      default: return 'bg-gray-500';
    }
  };

  const getStatusTitle = () => {
    if (connectionStatus === 'connected') {
      return isLive ? `Live: @${username}` : `Connected: @${username} (not live)`;
    }
    switch (connectionStatus) {
      case 'connecting': return `Connecting to @${inputUsername}...`;
      case 'error': return connectionError || 'Connection failed';
      default: return 'Not connected to TikTok Live';
    }
  };

  // If connected, show compact status display
  if (connectionStatus === 'connected') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-2 bg-tiktok-gray/80 hover:bg-tiktok-gray rounded-lg transition-colors border border-gray-600"
          title={getStatusTitle()}
        >
          <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${isLive ? 'animate-pulse' : ''}`}></div>
          <span className="text-white text-sm font-medium">@{username}</span>
          <svg className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded Dropdown */}
        {isExpanded && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-tiktok-black border border-tiktok-gray rounded-lg shadow-xl p-4 z-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${isLive ? 'animate-pulse' : ''}`}></div>
                <span className="text-white font-medium">@{username}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${isLive ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                {isLive ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            
            <div className="text-xs text-gray-400 mb-3">
              {isLive ? 'Receiving live stream data' : 'Connected but stream is offline'}
            </div>
            
            <button
              onClick={handleDisconnect}
              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // If not connected, show compact input
  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 bg-tiktok-gray/50 hover:bg-tiktok-gray/80 rounded-lg transition-colors border border-gray-600"
        title={getStatusTitle()}
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-gray-400 text-sm">TikTok</span>
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {/* Expanded Connection Form */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-tiktok-black border border-tiktok-gray rounded-lg shadow-xl p-4 z-50">
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-tiktok-red" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
              <h3 className="text-white font-medium">Connect to TikTok Live</h3>
            </div>
            
            {connectionStatus === 'error' && connectionError && (
              <div className="mb-3 p-2 bg-red-900/20 border border-red-700 rounded text-red-300 text-xs">
                {connectionError}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <span className="text-gray-400 text-xs">@</span>
              </div>
              <input
                type="text"
                placeholder="username"
                className="w-full pl-6 pr-2 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isConnecting}
              />
            </div>
            <button
              onClick={handleConnect}
              disabled={!inputUsername.trim() || isConnecting}
              className="px-3 py-2 bg-tiktok-red hover:bg-tiktok-pink disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm rounded transition-colors"
            >
              {isConnecting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Connect'
              )}
            </button>
          </div>
          
          <div className="text-xs text-gray-400 mt-2">
            Enter a TikTok username to connect to their live stream
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsExpanded(false)}
        ></div>
      )}
    </div>
  );
}
