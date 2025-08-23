import { useState, useEffect } from 'react';

/**
 * LikeTriggerModal provides a clean interface for adding/editing like triggers
 * Features: Quick presets, validation, keyboard shortcuts
 */
export default function LikeTriggerModal({
  isOpen,
  onClose,
  onSave,
  editingTrigger = null // { trigger } for editing
}) {
  const [threshold, setThreshold] = useState(100);
  const [key, setKey] = useState('a');
  const [durationSec, setDurationSec] = useState(1.0);

  // Preset options for quick setup
  const presets = [
    { threshold: 50, label: 'Every 50 likes' },
    { threshold: 100, label: 'Every 100 likes' },
    { threshold: 500, label: 'Every 500 likes' },
    { threshold: 1000, label: 'Every 1,000 likes' },
    { threshold: 5000, label: 'Every 5,000 likes' }
  ];

  // Initialize form for editing
  useEffect(() => {
    if (editingTrigger) {
      setThreshold(editingTrigger.threshold);
      setKey(editingTrigger.key);
      setDurationSec(editingTrigger.durationMs / 1000); // Convert ms to seconds
    } else {
      // Reset for new trigger
      setThreshold(100);
      setKey('a');
      setDurationSec(1.0);
    }
  }, [editingTrigger, isOpen]);

  const handleSave = () => {
    if (threshold > 0 && key.trim()) {
      onSave(threshold, key.trim(), durationSec * 1000); // Convert seconds to ms for backend
      onClose();
    }
  };

  const applyPreset = (presetThreshold) => {
    setThreshold(presetThreshold);
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
      <div className="relative w-full max-w-lg mx-4 bg-tiktok-black border border-tiktok-gray rounded-xl shadow-2xl animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-tiktok-gray">
          <div>
            <h2 className="text-xl font-semibold text-tiktok-white">
              {editingTrigger ? 'Edit Like Trigger' : 'Add Like Trigger'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Automate actions based on like count milestones
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
          {/* Quick Presets */}
          {!editingTrigger && (
            <div>
              <label className="block text-sm font-medium text-tiktok-white mb-3">
                Quick Setup
              </label>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.threshold}
                    onClick={() => applyPreset(preset.threshold)}
                    className={`p-3 rounded-lg border transition-colors text-sm ${
                      threshold === preset.threshold
                        ? 'bg-tiktok-cyan/20 border-tiktok-cyan text-tiktok-cyan'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-tiktok-white mb-2">
                Like Threshold *
              </label>
              <input
                type="number"
                min="1"
                placeholder="100"
                className="w-full bg-gray-800 border border-gray-600 px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Trigger action every N likes (must be greater than 0)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-tiktok-white mb-2">
                Keyboard Key *
              </label>
              <input
                placeholder="Key to press (e.g., a, space, ctrl+c)"
                className="w-full bg-gray-800 border border-gray-600 px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                maxLength={20}
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
                placeholder="0.3"
                className="w-full bg-gray-800 border border-gray-600 px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">
                How long to hold the key (1.0 seconds is typical)
              </p>
            </div>
          </div>

          {/* Live Preview */}
          {threshold > 0 && key.trim() && (
            <div className="p-4 bg-tiktok-gray/30 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-tiktok-white mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </h4>
              <div className="text-sm text-gray-300">
                Every <span className="text-tiktok-red font-semibold">{threshold.toLocaleString()}</span> likes,
                press <code className="bg-gray-800 px-2 py-1 rounded text-tiktok-cyan">"{key}"</code> for {durationSec}s
              </div>
            </div>
          )}

          {/* Statistics for editing */}
          {editingTrigger && (
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-tiktok-white mb-2">Current Statistics</h4>
              <div className="text-sm text-gray-300 space-y-1">
                <div>Fired: <span className="text-tiktok-cyan">{editingTrigger.firedCount}×</span></div>
                {editingTrigger.firedCount > 0 && (
                  <div>Last triggered at: <span className="text-tiktok-cyan">{(editingTrigger.firedCount * editingTrigger.threshold).toLocaleString()}</span> likes</div>
                )}
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
              disabled={!(threshold > 0 && key.trim())}
              className="px-4 py-2 bg-tiktok-red hover:bg-tiktok-pink disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-lg transition-colors font-medium"
            >
              {editingTrigger ? 'Save Changes' : 'Add Trigger'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
