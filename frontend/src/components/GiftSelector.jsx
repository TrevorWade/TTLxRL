import { useState, useEffect, useRef } from 'react';

/**
 * GiftSelector - Beautiful visual gift selection modal
 * Features: Search, grid layout, thumbnails, diamond costs, smooth animations
 */
export default function GiftSelector({ 
  isOpen, 
  onClose, 
  onSelectGift, 
  giftCatalog = [],
  onRefreshCatalog 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredGifts, setFilteredGifts] = useState(giftCatalog);
  const searchInputRef = useRef(null);
  const modalRef = useRef(null);

  // Filter gifts based on search query (simple contains)
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredGifts(giftCatalog);
    } else {
      setFilteredGifts(
        giftCatalog.filter(g =>
          g.name?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q)
        )
      );
    }
  }, [giftCatalog, searchQuery]);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key and outside clicks
  useEffect(() => {
    function handleKeydown(e) {
      if (e.key === 'Escape') onClose();
    }

    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeydown);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGiftSelect = (gift) => {
    onSelectGift(gift);
    onClose();
    setSearchQuery(''); // Reset search for next time
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        ref={modalRef}
        className="bg-tiktok-black border border-tiktok-gray rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col animate-fadeInUp"
      >
        {/* Header */}
        <div className="p-6 border-b border-tiktok-gray">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-tiktok-white">Select a Gift</h2>
            <div className="flex items-center gap-2">
              {onRefreshCatalog && (
                <button
                  onClick={onRefreshCatalog}
                  className="w-8 h-8 rounded-full bg-tiktok-cyan/20 hover:bg-tiktok-cyan/30 transition-colors flex items-center justify-center"
                  title="Refresh gift catalog"
                >
                  <svg className="w-4 h-4 text-tiktok-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-tiktok-gray hover:bg-gray-600 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search gifts by name..."
              className="w-full pl-10 pr-4 py-3 bg-tiktok-gray border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-tiktok-cyan focus:outline-none transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Results Counter */}
          <div className="mt-3 text-sm text-gray-400">
            {filteredGifts.length} {filteredGifts.length === 1 ? 'gift' : 'gifts'} available
          </div>
        </div>

        {/* Gift Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredGifts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredGifts.map((gift) => (
                <GiftCard
                  key={gift.id || gift.name}
                  gift={gift}
                  onSelect={() => handleGiftSelect(gift)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 mb-4 bg-tiktok-gray rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">No gifts found</h3>
              <p className="text-gray-400 text-sm">
                {searchQuery ? `No gifts match "${searchQuery}"` : 'No gifts available in catalog'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-tiktok-gray">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>Click a gift to add to your mapping</div>
            <div>Press <kbd className="px-2 py-1 bg-tiktok-gray rounded text-xs">Esc</kbd> to close</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual gift card component with hover effects and visual details
 */
function GiftCard({ gift, onSelect }) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <button
      onClick={onSelect}
      className="group relative bg-tiktok-gray hover:bg-gray-700 border border-gray-600 hover:border-tiktok-cyan rounded-xl p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-tiktok-cyan/20 focus:outline-none focus:ring-2 focus:ring-tiktok-cyan focus:ring-opacity-50"
    >
      {/* Gift Image */}
      <div className="aspect-square mb-3 bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        {gift.imageUrl && !imageError ? (
          <img
            src={gift.imageUrl}
            alt={gift.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Gift Details */}
      <div className="text-center">
        <h3 className="font-medium text-white text-sm mb-1 line-clamp-2 group-hover:text-tiktok-cyan transition-colors">
          {gift.name}
        </h3>
        
        {/* Diamond Cost */}
        {gift.diamondCount && (
          <div className="flex items-center justify-center gap-1 text-xs text-yellow-400">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L8.5 8H15.5L12 2ZM8.5 8L2 12L8.5 16L12 10L8.5 8ZM15.5 8L12 10L15.5 16L22 12L15.5 8ZM8.5 16L12 22L15.5 16L12 10L8.5 16Z"/>
            </svg>
            <span>{gift.diamondCount}</span>
          </div>
        )}
      </div>
      
      {/* Hover Glow Effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-tiktok-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
    </button>
  );
}
