import { useState } from 'react';

/**
 * TabSystem provides a clean tabbed interface for Gift Mappings and Like Triggers
 * Features: Tab switching, consistent styling, mobile-responsive design
 */
export default function TabSystem({ children }) {
  const [activeTab, setActiveTab] = useState('gifts');

  const tabs = [
    { id: 'gifts', label: 'Gift Mappings', icon: '🎁' },
    { id: 'likes', label: 'Like Triggers', icon: '❤️' }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-tiktok-gray bg-tiktok-black/80 backdrop-blur-sm">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === tab.id
                  ? 'text-tiktok-cyan border-tiktok-cyan bg-tiktok-cyan/5'
                  : 'text-gray-400 border-transparent hover:text-tiktok-white hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {children({ activeTab, setActiveTab })}
      </div>
    </div>
  );
}

/**
 * TabPanel component for individual tab content
 */
export function TabPanel({ value, activeTab, children, className = "" }) {
  if (value !== activeTab) return null;

  return (
    <div className={`h-full ${className}`}>
      {children}
    </div>
  );
}
