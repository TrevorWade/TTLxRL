import { useState } from 'react';
import { send } from '../ws';

/**
 * LikeTriggerList provides a clean list view for like triggers
 * Features: Testing, editing, progress indicators, statistics
 */
export default function LikeTriggerList({
  likeTriggers,
  totalLikes,
  onEdit,
  onRemove,
  onResetCounts
}) {
  const [testingTrigger, setTestingTrigger] = useState(null);

  // Test a like trigger by simulating likes
  const testLikeTrigger = async (trigger) => {
    setTestingTrigger(trigger.id);
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
    // Clear testing state after a delay
    setTimeout(() => setTestingTrigger(null), 1000);
  };

  const getProgress = (trigger) => {
    const progress = (totalLikes % trigger.threshold) / trigger.threshold;
    return Math.min(progress * 100, 100);
  };

  const getLikesUntilNext = (trigger) => {
    return trigger.threshold - (totalLikes % trigger.threshold);
  };

  if (likeTriggers.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <p className="text-gray-400 mb-2">No like triggers configured</p>
        <p className="text-gray-500 text-sm">Click the + button to add your first trigger</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {likeTriggers.length} trigger{likeTriggers.length !== 1 ? 's' : ''} configured
        </div>
        <button
          onClick={onResetCounts}
          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          title="Reset all trigger counts"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset Counts
        </button>
      </div>

      {/* Trigger List */}
      <div className="space-y-3">
        {likeTriggers.map((trigger) => (
          <TriggerCard
            key={trigger.id}
            trigger={trigger}
            totalLikes={totalLikes}
            progress={getProgress(trigger)}
            likesUntilNext={getLikesUntilNext(trigger)}
            isTestin={testingTrigger === trigger.id}
            onTest={() => testLikeTrigger(trigger)}
            onEdit={() => onEdit(trigger)}
            onRemove={() => onRemove(trigger.id)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual trigger card with progress indicator and actions
 */
function TriggerCard({ 
  trigger, 
  totalLikes, 
  progress, 
  likesUntilNext, 
  isTesting, 
  onTest, 
  onEdit, 
  onRemove 
}) {
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Main Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-tiktok-white font-medium">
                Every <span className="text-tiktok-red font-semibold">{trigger.threshold.toLocaleString()}</span> likes
              </div>
              <div className="text-sm text-gray-400">
                Press "<span className="text-tiktok-cyan font-mono">{trigger.key}</span>" for {(trigger.durationMs / 1000).toFixed(1)}s
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">
                {likesUntilNext === trigger.threshold ? trigger.threshold : likesUntilNext} more to trigger
              </div>
              <div className="text-xs text-gray-500">
                Fired {trigger.firedCount}×
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Progress to next trigger</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-tiktok-cyan h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Statistics */}
          {trigger.firedCount > 0 && (
            <div className="text-xs text-gray-500">
              Last triggered at {(trigger.firedCount * trigger.threshold).toLocaleString()} likes
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onTest}
            disabled={isTesting}
            className={`p-2 rounded-lg transition-colors ${
              isTesting
                ? 'bg-blue-800 text-blue-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title="Test trigger"
          >
            {isTesting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white transition-colors"
            title="Edit trigger"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="Delete trigger"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
