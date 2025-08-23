import { useState } from 'react';

/**
 * FloatingActionButton provides quick access to add new mappings/triggers
 * Features: Context-aware actions, smooth animations, mobile-friendly
 */
export default function FloatingActionButton({ activeTab, onAddGift, onAddLike }) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: 'gift',
      label: 'Add Gift Mapping',
      icon: '🎁',
      color: 'bg-tiktok-red hover:bg-tiktok-pink',
      onClick: () => {
        onAddGift();
        setIsOpen(false);
      }
    },
    {
      id: 'like',
      label: 'Add Like Trigger',
      icon: '❤️',
      color: 'bg-tiktok-cyan hover:bg-tiktok-cyan/80 text-black',
      onClick: () => {
        onAddLike();
        setIsOpen(false);
      }
    }
  ];

  // Primary action based on active tab
  const primaryAction = activeTab === 'gifts' ? actions[0] : actions[1];
  const secondaryAction = activeTab === 'gifts' ? actions[1] : actions[0];

  const handlePrimaryClick = () => {
    primaryAction.onClick();
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Secondary Actions */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 space-y-3 animate-fadeInUp">
          <button
            onClick={secondaryAction.onClick}
            className={`flex items-center gap-3 px-4 py-3 ${secondaryAction.color} text-white rounded-lg shadow-lg transition-all duration-200 hover:scale-105`}
          >
            <span className="text-lg">{secondaryAction.icon}</span>
            <span className="font-medium whitespace-nowrap">{secondaryAction.label}</span>
          </button>
        </div>
      )}

      {/* Main FAB */}
      <div className="flex items-center gap-3">
        {/* Expand Button */}
        <button
          onClick={toggleMenu}
          className={`w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 text-white shadow-lg transition-all duration-200 flex items-center justify-center ${
            isOpen ? 'rotate-45' : ''
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {/* Primary Action Button */}
        <button
          onClick={handlePrimaryClick}
          className={`flex items-center gap-3 px-6 py-3 ${primaryAction.color} rounded-lg shadow-lg transition-all duration-200 hover:scale-105`}
        >
          <span className="text-lg">{primaryAction.icon}</span>
          <span className="font-medium hidden sm:inline">{primaryAction.label}</span>
          <span className="font-medium sm:hidden">Add</span>
        </button>
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
}
