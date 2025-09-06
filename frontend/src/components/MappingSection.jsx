import { useState, useEffect } from 'react';
import TabSystem, { TabPanel } from './TabSystem';
import GlobalControlBar from './GlobalControlBar';
import GiftMappingModal from './GiftMappingModal';
import GiftMappingTable from './GiftMappingTable';
import LikeTriggerModal from './LikeTriggerModal';
import LikeTriggerList from './LikeTriggerList';
import FloatingActionButton from './FloatingActionButton';

/**
 * CleanMappingSection provides a modern, tabbed interface for gift mappings and like triggers
 * Features: Tabbed layout, modals, floating action button, search/filter, bulk actions
 */
export function CleanMappingSection({ 
  mapping, 
  setMapping, 
  profiles, 
  profileName, 
  setProfileName,
  onSaveProfile,
  onLoadProfile,
  onDeleteProfile,
  onClearProfile,
  onTestGift,
  paused,
  onTogglePause,
  totalLikes,
  // Like trigger props
  likeTriggers,
  onAddLikeTrigger,
  onRemoveLikeTrigger,
  onResetTriggerCounts
}) {
  // Removed gift catalog usage; mappings rely only on real TikTok gifts seen live
  
  // Modal states
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showLikeModal, setShowLikeModal] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [editingLike, setEditingLike] = useState(null);

  // Catalog removed: no loading or static/icon placeholders anymore
  
  function upsertMapping(giftName, key, durationSec, cooldownMs, imageUrl = null) {
    const gift = giftName.toLowerCase().trim();
    if (!gift) return;
    const next = { 
      ...mapping, 
      [gift]: { 
        key, 
        durationSec: Number(durationSec) || 1.0, 
        cooldownMs: Number(cooldownMs) || 0,
        imageUrl: imageUrl || mapping[gift]?.imageUrl || null
      } 
    };
    setMapping(next);
  }

  function removeMapping(giftName) {
    const gift = giftName.toLowerCase();
    const next = { ...mapping };
    delete next[gift];
    setMapping(next);
  }

  // Modal handlers
  const handleAddGift = () => {
    setEditingGift(null);
    setShowGiftModal(true);
  };

  const handleEditGift = (gift, config) => {
    setEditingGift({ gift, config });
    setShowGiftModal(true);
  };

  const handleSaveGift = (giftName, key, durationSec, cooldownMs, imageUrl) => {
    if (editingGift && editingGift.gift !== giftName.toLowerCase()) {
      removeMapping(editingGift.gift);
    }
    upsertMapping(giftName, key, durationSec, cooldownMs, imageUrl);
  };

  const handleAddLike = () => {
    setEditingLike(null);
    setShowLikeModal(true);
  };

  const handleEditLike = (trigger) => {
    setEditingLike(trigger);
    setShowLikeModal(true);
  };

  const handleSaveLike = (threshold, key, durationMs) => {
    if (editingLike) {
      onRemoveLikeTrigger(editingLike.id);
    }
    onAddLikeTrigger(threshold, key, durationMs);
  };

  return (
    <section className="lg:col-span-3 bg-tiktok-black flex flex-col border-r border-tiktok-gray">
      {/* Global Control Bar */}
      <GlobalControlBar
        paused={paused}
        onTogglePause={onTogglePause}
        profiles={profiles}
        profileName={profileName}
        setProfileName={setProfileName}
        onSaveProfile={onSaveProfile}
        onLoadProfile={onLoadProfile}
        onDeleteProfile={onDeleteProfile}
        onClearProfile={onClearProfile}
      />

      {/* Tabbed Content */}
      <div className="flex-1 overflow-hidden">
        <TabSystem>
          {({ activeTab, setActiveTab }) => (
            <>
              <TabPanel value="gifts" activeTab={activeTab} className="h-full p-6 overflow-y-auto">
                <div className="animate-fadeInUp space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-tiktok-white mb-2">Gift Mappings</h2>
                    <p className="text-gray-400 text-sm">Map TikTok gifts to keyboard actions</p>
                  </div>
                  
                  <GiftMappingTable
                    mapping={mapping}
                    onTest={onTestGift}
                    onEdit={handleEditGift}
                    onRemove={removeMapping}
                  />
                </div>
              </TabPanel>

              <TabPanel value="likes" activeTab={activeTab} className="h-full p-6 overflow-y-auto">
                <div className="animate-fadeInUp space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-tiktok-white mb-2">Like Triggers</h2>
                    <p className="text-gray-400 text-sm">Automate actions based on like count milestones</p>
                  </div>
                  
                  <LikeTriggerList
                    likeTriggers={likeTriggers}
                    totalLikes={totalLikes}
                    onEdit={handleEditLike}
                    onRemove={onRemoveLikeTrigger}
                    onResetCounts={onResetTriggerCounts}
                  />
                </div>
              </TabPanel>

              {/* Floating Action Button */}
              <FloatingActionButton
                activeTab={activeTab}
                onAddGift={handleAddGift}
                onAddLike={handleAddLike}
              />
            </>
          )}
        </TabSystem>
      </div>

      {/* Modals */}
      <GiftMappingModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        onSave={handleSaveGift}
        editingMapping={editingGift}
      />

      <LikeTriggerModal
        isOpen={showLikeModal}
        onClose={() => setShowLikeModal(false)}
        onSave={handleSaveLike}
        editingTrigger={editingLike}
      />
    </section>
  );
}


