import { useState, useEffect } from 'react';
import { send } from '../ws';

/**
 * TikTokConnection component for managing TikTok Live connections
 * Features: Username input, connection status, connect/disconnect controls
 */
export default function TikTokConnection({ 
  connectionStatus = 'disconnected', 
  username = '', 
  connectionError = null,
  onConnectionChange 
}) {
  const [inputUsername, setInputUsername] = useState('');
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
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        );
      case 'connecting':
        return (
          <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
        );
      case 'error':
        return (
          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
        );
      default:
        return (
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
        );
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return `Connected to @${username}`;
      case 'connecting': return `Connecting to @${inputUsername}...`;
      case 'error': return connectionError || 'Connection failed';
      default: return 'Not connected';
    }
  };

  return (
    <div className="bg-tiktok-gray/50 rounded-lg border border-gray-600 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-tiktok-white flex items-center gap-2">
          <svg className="w-5 h-5 text-tiktok-red" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          </svg>
          TikTok Live Connection
        </h3>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {connectionStatus === 'connected' && '●'} 
            {connectionStatus === 'connecting' && '○'} 
            {connectionStatus === 'error' && '✕'} 
            {connectionStatus === 'disconnected' && '○'}
          </span>
        </div>
      </div>

      {/* Status Text */}
      <div className={`text-sm mb-4 ${getStatusColor()}`}>
        {getStatusText()}
      </div>

      {/* Connection Controls */}
      {connectionStatus !== 'connected' ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-sm">@</span>
            </div>
            <input
              type="text"
              placeholder="TikTok username"
              className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none transition-colors"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isConnecting}
            />
          </div>
          <button
            onClick={handleConnect}
            disabled={!inputUsername.trim() || isConnecting}
            className="px-4 py-2 bg-tiktok-red hover:bg-tiktok-pink disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {isConnecting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Connecting...
              </div>
            ) : (
              'Connect'
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Live connection active</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Error Display */}
      {connectionError && connectionStatus === 'error' && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="text-red-400 text-sm font-medium">Connection Error</div>
              <div className="text-red-300 text-xs mt-1">{connectionError}</div>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {connectionStatus === 'disconnected' && (
        <div className="mt-3 text-xs text-gray-400">
          Enter a TikTok username (without @) to connect to their live stream
        </div>
      )}
    </div>
  );
}
