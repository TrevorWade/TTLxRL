import { useState, useMemo, useEffect } from 'react';

/**
 * GiftMappingTable provides a clean, searchable data grid for gift mappings
 * Features: Search/filter, bulk actions, inline editing, context menus
 */
export default function GiftMappingTable({
  mapping,
  onTest,
  onEdit,
  onRemove,
  onBulkDelete
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMappings, setSelectedMappings] = useState(new Set());

  // Broadcast mapping changes so the detached overlay window receives updates immediately
  useEffect(() => {
    try {
      const bc = new BroadcastChannel('ttlrl-overlay');
      bc.postMessage({ type: 'mapping', mapping });
      bc.close();
    } catch {}
  }, [mapping]);

  // Filter mappings based on search term
  const filteredMappings = useMemo(() => {
    const entries = Object.entries(mapping);
    if (!searchTerm.trim()) return entries;
    
    const term = searchTerm.toLowerCase();
    return entries.filter(([gift, config]) => 
      gift.toLowerCase().includes(term) || 
      config.key.toLowerCase().includes(term)
    );
  }, [mapping, searchTerm]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedMappings(new Set(filteredMappings.map(([gift]) => gift)));
    } else {
      setSelectedMappings(new Set());
    }
  };

  const handleSelectMapping = (gift, checked) => {
    const newSelected = new Set(selectedMappings);
    if (checked) {
      newSelected.add(gift);
    } else {
      newSelected.delete(gift);
    }
    setSelectedMappings(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedMappings.size === 0) return;
    
    if (window.confirm(`Delete ${selectedMappings.size} selected mappings?`)) {
      selectedMappings.forEach(gift => onRemove(gift));
      setSelectedMappings(new Set());
    }
  };

  const allSelected = filteredMappings.length > 0 && selectedMappings.size === filteredMappings.length;
  const someSelected = selectedMappings.size > 0 && selectedMappings.size < filteredMappings.length;

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search gifts or keys..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {selectedMappings.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {selectedMappings.size} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-tiktok-gray rounded-lg border border-gray-600 overflow-hidden">
        {filteredMappings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800/50 border-b border-gray-700">
                  <th className="py-3 px-4 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={input => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-tiktok-cyan bg-gray-800 border-gray-600 rounded focus:ring-tiktok-cyan focus:ring-2"
                    />
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Gift</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Key</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Duration</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMappings.map(([gift, config]) => (
                  <MappingRow
                    key={gift}
                    gift={gift}
                    config={config}
                    selected={selectedMappings.has(gift)}
                    onSelect={(checked) => handleSelectMapping(gift, checked)}
                    onTest={() => onTest(gift)}
                    onEdit={() => onEdit(gift, config)}
                    onRemove={() => onRemove(gift)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            {searchTerm ? (
              <div>
                <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-400">No mappings match "{searchTerm}"</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-tiktok-cyan hover:text-tiktok-white transition-colors"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div>
                <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-400 mb-2">No gift mappings configured</p>
                <p className="text-gray-500 text-sm">Click the + button to add your first mapping</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual mapping row component
 */
function MappingRow({ gift, config, selected, onSelect, onTest, onEdit, onRemove }) {
  const [imageError, setImageError] = useState(false);

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-800/30 transition-colors">
      <td className="py-3 px-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="w-4 h-4 text-tiktok-cyan bg-gray-800 border-gray-600 rounded focus:ring-tiktok-cyan focus:ring-2"
        />
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Gift Image */}
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 border border-gray-600 shrink-0">
            {config.imageUrl && !imageError ? (
              <img
                src={config.imageUrl}
                alt={gift}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </div>
          {/* Gift Name */}
          <div>
            <div className="text-tiktok-white font-medium">{gift}</div>
            {config.cooldownMs > 0 && (
              <div className="text-xs text-gray-500">+{config.cooldownMs}ms cooldown</div>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <code className="bg-gray-800 px-3 py-1 rounded text-tiktok-cyan text-sm font-mono">
          {config.key}
        </code>
      </td>
      <td className="py-3 px-4 text-gray-300">
        {config.durationSec ?? (config.durationMs ? (config.durationMs/1000) : 0)}s
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onTest}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            title="Test mapping"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white transition-colors"
            title="Edit mapping"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="Delete mapping"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
