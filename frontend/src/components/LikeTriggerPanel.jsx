import { useState } from 'react';
import { send } from '../ws';

/**
 * LikeTriggerPanel manages like-based trigger automation
 * Compact interface for adding, removing, monitoring, testing, and editing like triggers
 * Features: Add triggers, view active triggers, reset counts, test triggers, edit triggers
 */
export default function LikeTriggerPanel({ 
  likeTriggers, 
  onAddLikeTrigger, 
  onRemoveLikeTrigger, 
  onResetTriggerCounts 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Test a like trigger by simulating likes
  const testLikeTrigger = (trigger) => {
    try {
      send({
        type: 'test-like-trigger',
        triggerKey: trigger.key,
        targetLikes: trigger.threshold
      });
      console.log(`Testing like trigger: ${trigger.threshold} likes → ${trigger.key}`);
    } catch (error) {
      console.error('Failed to test like trigger:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-tiktok-white">Like Triggers</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-tiktok-gray px-2 py-1 rounded">
            {likeTriggers.length} active
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-6 h-6 rounded bg-tiktok-gray hover:bg-gray-600 transition-colors flex items-center justify-center"
          >
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add New Trigger - Always Visible */}
      <AddLikeTrigger onAdd={onAddLikeTrigger} />

      {/* Expandable Triggers List */}
      {isExpanded && (
        <div className="space-y-3 animate-fadeInUp">
          {/* Control Buttons */}
          {likeTriggers.length > 0 && (
            <div className="flex gap-2">
              <button 
                onClick={onResetTriggerCounts}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors"
              >
                Reset Counts
              </button>
            </div>
          )}

          {/* Active Triggers */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {likeTriggers.map((trigger) => (
              <TriggerCard 
                key={trigger.id} 
                trigger={trigger} 
                onRemove={() => onRemoveLikeTrigger(trigger.id)}
                onTest={() => testLikeTrigger(trigger)}
                onEdit={(updatedTrigger) => {
                  onRemoveLikeTrigger(trigger.id);
                  onAddLikeTrigger(updatedTrigger.threshold, updatedTrigger.key, updatedTrigger.durationMs);
                }}
              />
            ))}
            {!likeTriggers.length && (
              <div className="text-center py-6 text-gray-400 text-sm">
                No triggers configured. Add one above.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * AddLikeTrigger form for creating new like-based triggers
 * Compact form with sensible defaults
 */
function AddLikeTrigger({ onAdd }) {
  const [threshold, setThreshold] = useState(100);
  const [key, setKey] = useState('a');
  const [durationSec, setDurationSec] = useState(1.0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (threshold > 0 && key.trim()) {
      onAdd(threshold, key.trim(), durationSec * 1000); // Convert seconds to ms
      // Reset to defaults
      setThreshold(100);
      setKey('a');
      setDurationSec(1.0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-tiktok-gray/50 rounded-lg border border-gray-600">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-20">
          <label className="block text-xs text-gray-400 mb-1">Every N likes</label>
          <input
            type="number"
            min="1"
            className="w-full bg-gray-800 border border-gray-600 px-2 py-1 rounded text-white text-sm focus:border-tiktok-cyan focus:outline-none"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </div>
        <div className="flex-1 min-w-16">
          <label className="block text-xs text-gray-400 mb-1">Key</label>
          <input
            className="w-full bg-gray-800 border border-gray-600 px-2 py-1 rounded text-white text-sm focus:border-tiktok-cyan focus:outline-none"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            maxLength={5}
          />
        </div>
        <div className="flex-1 min-w-16">
          <label className="block text-xs text-gray-400 mb-1">Duration (s)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            className="w-full bg-gray-800 border border-gray-600 px-2 py-1 rounded text-white text-sm focus:border-tiktok-cyan focus:outline-none"
            value={durationSec}
            onChange={(e) => setDurationSec(Number(e.target.value))}
          />
        </div>
        <button
          type="submit"
          className="px-3 py-1 bg-tiktok-red hover:bg-tiktok-pink text-white text-sm rounded transition-colors font-medium"
        >
          Add
        </button>
      </div>
    </form>
  );
}

/**
 * Individual trigger card showing trigger details and controls
 * Features: Display info, test, edit, and remove triggers
 */
function TriggerCard({ trigger, onRemove, onTest, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editThreshold, setEditThreshold] = useState(trigger.threshold);
  const [editKey, setEditKey] = useState(trigger.key);
  const [editDurationMs, setEditDurationMs] = useState(trigger.durationMs);

  const handleSaveEdit = () => {
    if (editThreshold > 0 && editKey.trim()) {
      onEdit({
        threshold: editThreshold,
        key: editKey.trim(),
        durationMs: editDurationMs
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditThreshold(trigger.threshold);
    setEditKey(trigger.key);
    setEditDurationMs(trigger.durationMs);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Likes</label>
              <input
                type="number"
                min="1"
                className="w-full bg-gray-800 border border-gray-600 px-2 py-1 rounded text-white text-sm focus:border-tiktok-cyan focus:outline-none"
                value={editThreshold}
                onChange={(e) => setEditThreshold(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Key</label>
              <input
                className="w-full bg-gray-800 border border-gray-600 px-2 py-1 rounded text-white text-sm focus:border-tiktok-cyan focus:outline-none"
                value={editKey}
                onChange={(e) => setEditKey(e.target.value)}
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Duration (ms)</label>
              <input
                type="number"
                min="0"
                className="w-full bg-gray-800 border border-gray-600 px-2 py-1 rounded text-white text-sm focus:border-tiktok-cyan focus:outline-none"
                value={editDurationMs}
                onChange={(e) => setEditDurationMs(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancelEdit}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-2 py-1 bg-tiktok-cyan hover:bg-tiktok-cyan/80 text-black text-xs rounded transition-colors font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex-1">
        <div className="text-sm text-tiktok-white">
          Every <span className="text-tiktok-cyan font-semibold">{trigger.threshold.toLocaleString()}</span> likes
        </div>
        <div className="text-xs text-gray-400">
          Press "<span className="text-tiktok-cyan font-mono">{trigger.key}</span>" for {trigger.durationMs}ms
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Fired {trigger.firedCount}× 
          {trigger.firedCount > 0 && (
            <span className="text-tiktok-cyan ml-1">
              (last: {(trigger.firedCount * trigger.threshold).toLocaleString()})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onTest}
          className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center"
          title="Test trigger"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className="w-7 h-7 rounded bg-gray-600 hover:bg-gray-500 transition-colors flex items-center justify-center"
          title="Edit trigger"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onRemove}
          className="w-7 h-7 rounded bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center"
          title="Remove trigger"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
