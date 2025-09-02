import { useState, useEffect } from 'react';

/**
 * GiftMappingModal provides a clean, focused interface for adding/editing gift mappings
 * Features: Large gift selector, advanced options, live preview, keyboard shortcuts
 */
export default function GiftMappingModal({
  isOpen,
  onClose,
  onSave,
  editingMapping = null // { gift, config } for editing
}) {
  const [selectedGift, setSelectedGift] = useState(null);
  const [giftName, setGiftName] = useState('');
  const [key, setKey] = useState('a');
  const [durationSec, setDurationSec] = useState(1.0);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showGiftSelector, setShowGiftSelector] = useState(false);

  // Initialize form for editing
  useEffect(() => {
    if (editingMapping) {
      setGiftName(editingMapping.gift);
      setKey(editingMapping.config.key);
      setDurationSec(editingMapping.config.durationSec ?? (editingMapping.config.durationMs ? editingMapping.config.durationMs/1000 : 0));
      setCooldownMs(editingMapping.config.cooldownMs ?? 0);
      setShowAdvanced(editingMapping.config.cooldownMs > 0);
      setSelectedGift(null); // Don't auto-select for editing
    } else {
      // Reset for new mapping
      setSelectedGift(null);
      setGiftName('');
      setKey('a');
      setDurationSec(1.0);
      setCooldownMs(0);
      setShowAdvanced(false);
    }
  }, [editingMapping, isOpen]);

  const handleSave = () => {
    const finalGiftName = selectedGift?.name || giftName.trim();
    if (!finalGiftName || !key.trim()) return;
    
    const imageUrl = selectedGift?.imageUrl || editingMapping?.config?.imageUrl || null;
    onSave(finalGiftName, key.trim(), durationSec, cooldownMs, imageUrl);
    onClose();
  };

  const handleGiftSelect = (gift) => {
    setSelectedGift(gift);
    setGiftName(gift.name);
    setShowGiftSelector(false);
  };

  const clearGiftSelection = () => {
    setSelectedGift(null);
    setGiftName('');
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleSave]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-tiktok-black border border-tiktok-gray rounded-xl shadow-2xl animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-tiktok-gray">
          <div>
            <h2 className="text-xl font-semibold text-tiktok-white">
              {editingMapping ? 'Edit Gift Mapping' : 'Add Gift Mapping'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Configure a TikTok gift to trigger keyboard actions
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Gift Selection */}
          <div>
            <label className="block text-sm font-medium text-tiktok-white mb-3">
              Select Gift
            </label>
            
            {selectedGift ? (
              <div className="flex items-center gap-4 p-4 bg-tiktok-cyan/10 border border-tiktok-cyan rounded-lg">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 border border-gray-600 shrink-0">
                  {selectedGift.imageUrl ? (
                    <img
                      src={selectedGift.imageUrl}
                      alt={selectedGift.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-tiktok-white font-medium">{selectedGift.name}</h3>
                  {selectedGift.diamondCount && (
                    <p className="text-gray-400 text-sm">{selectedGift.diamondCount} diamonds</p>
                  )}
                </div>
                <button
                  onClick={clearGiftSelection}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <input
                    placeholder="Gift name (e.g., Rose)"
                    className="flex-1 bg-gray-800 border border-gray-600 px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
                    value={giftName}
                    onChange={(e) => setGiftName(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Type the exact TikTok gift name you want to map.
                </p>
              </div>
            )}
          </div>

          {/* Key Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-tiktok-white mb-2">
                Keyboard Key *
              </label>
              <input
                placeholder="Key to press (e.g., a, space, ctrl+c)"
                className="w-full bg-gray-800 border border-gray-600 px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use simple keys (a-z, 0-9) or combinations (ctrl+c, shift+f1)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-tiktok-white mb-2">
                Hold Duration (seconds)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full bg-gray-800 border border-gray-600 px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">
                How long to hold the key (1.0 seconds is typical)
              </p>
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-gray-400 hover:text-tiktok-white transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-sm font-medium">Advanced Options</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                <div>
                  <label className="block text-sm font-medium text-tiktok-white mb-2">
                    Cooldown (milliseconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full bg-gray-800 border border-gray-600 px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
                    value={cooldownMs}
                    onChange={(e) => setCooldownMs(Number(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum time between triggers (0 = no cooldown)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Live Preview */}
          {(selectedGift || giftName.trim()) && key.trim() && (
            <div className="p-4 bg-tiktok-gray/30 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-tiktok-white mb-2">Preview</h4>
              <div className="text-sm text-gray-300">
                When someone sends <span className="text-tiktok-cyan font-medium">"{selectedGift?.name || giftName}"</span>,
                press <code className="bg-gray-800 px-2 py-1 rounded text-tiktok-cyan">"{key}"</code> for {durationSec}s
                {cooldownMs > 0 && <span> (cooldown: {cooldownMs}ms)</span>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-tiktok-gray">
          <div className="text-xs text-gray-500">
            Press <kbd className="bg-gray-700 px-2 py-1 rounded">Esc</kbd> to cancel, <kbd className="bg-gray-700 px-2 py-1 rounded">Ctrl+Enter</kbd> to save
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!((selectedGift || giftName.trim()) && key.trim())}
              className="px-4 py-2 bg-tiktok-red hover:bg-tiktok-pink disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-lg transition-colors font-medium"
            >
              {editingMapping ? 'Save Changes' : 'Add Mapping'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
