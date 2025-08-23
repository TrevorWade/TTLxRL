/**
 * Gift Parser Service
 * Transforms raw TikTok gift data from gifts.json into app-compatible format
 * Handles data normalization, image URL selection, and fallback logic
 */

// Cache for the gift data to avoid repeated fetches
let giftDataCache = null;

/**
 * Loads the gift data from the JSON file
 * @returns {Promise<Object>} The raw gift data
 */
async function loadGiftData() {
  if (giftDataCache) {
    console.log('📋 Using cached gift data with', giftDataCache.GiftList?.length || 0, 'gifts');
    return giftDataCache;
  }

  try {
    console.log('📁 Fetching gift data from /gifts.json...');
    const response = await fetch('/gifts.json');
    if (!response.ok) {
      throw new Error(`Failed to load gifts.json: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 Raw gift data loaded:', {
      hasGiftList: !!data.GiftList,
      giftListLength: data.GiftList?.length || 0,
      firstGift: data.GiftList?.[0]?.name || 'none'
    });
    
    giftDataCache = data;
    return data;
  } catch (error) {
    console.error('❌ Failed to load gift data:', error);
    return { GiftList: [] };
  }
}

/**
 * Transforms raw TikTok gift data to app format
 * @param {Object} rawGift - Raw gift object from TikTok API
 * @returns {Object} Normalized gift object for the app
 */
function transformGift(rawGift) {
  // Extract primary icon URL from icon.url_list or image.url_list
  const iconUrl = rawGift.icon?.url_list?.[0] || rawGift.image?.url_list?.[0] || null;
  
  return {
    id: rawGift.id?.toString() || rawGift.name?.toLowerCase().replace(/\s+/g, '-'),
    name: rawGift.name || 'Unknown Gift',
    imageUrl: iconUrl,
    diamondCount: rawGift.diamond_count || 0,
    description: rawGift.describe || rawGift.name || '',
    // Additional metadata for filtering
    canPutInGiftBox: rawGift.can_put_in_gift_box || false,
    isBroadcastGift: rawGift.is_broadcast_gift || false,
    isDisplayedOnPanel: rawGift.is_displayed_on_panel || true,
    type: rawGift.type || 1,
    combo: rawGift.combo || false,
    duration: rawGift.duration || 0
  };
}

/**
 * Loads and parses all gifts from the local JSON file
 * @returns {Promise<Array>} Array of transformed gift objects
 */
export async function loadAllGifts() {
  try {
    console.log('🚀 loadAllGifts() called');
    const data = await loadGiftData();
    
    if (!data?.GiftList || !Array.isArray(data.GiftList)) {
      console.warn('⚠️ Invalid gift data structure in gifts.json');
      return [];
    }
    
    console.log(`🔄 Transforming ${data.GiftList.length} raw gifts...`);
    const transformedGifts = data.GiftList.map(transformGift);
    console.log(`✅ Successfully transformed ${transformedGifts.length} gifts`);
    
    // Sort by diamond count for better UX
    const sortedGifts = transformedGifts.sort((a, b) => a.diamondCount - b.diamondCount);
    console.log(`📊 Final gift count: ${sortedGifts.length}`);
    
    return sortedGifts;
    
  } catch (error) {
    console.error('❌ Failed to parse gift data:', error);
    return [];
  }
}

/**
 * Filters gifts by price range
 * @param {Array} gifts - Array of gift objects
 * @param {number} minDiamonds - Minimum diamond count
 * @param {number} maxDiamonds - Maximum diamond count
 * @returns {Array} Filtered gifts within the price range
 */
export function filterGiftsByPrice(gifts, minDiamonds = 0, maxDiamonds = Infinity) {
  return gifts.filter(gift => 
    gift.diamondCount >= minDiamonds && gift.diamondCount <= maxDiamonds
  );
}

/**
 * Gets price tier information for quick filtering
 * @returns {Array} Array of price tier objects
 */
export function getPriceTiers() {
  return [
    { label: '1-9', min: 1, max: 9, count: 0 },
    { label: '10-99', min: 10, max: 99, count: 0 },
    { label: '100-999', min: 100, max: 999, count: 0 },
    { label: '1000+', min: 1000, max: Infinity, count: 0 }
  ];
}

/**
 * Updates price tier counts based on current gift list
 * @param {Array} gifts - Array of gift objects
 * @param {Array} tiers - Array of price tier objects
 * @returns {Array} Updated price tiers with counts
 */
export function updatePriceTierCounts(gifts, tiers) {
  return tiers.map(tier => ({
    ...tier,
    count: gifts.filter(gift => 
      gift.diamondCount >= tier.min && gift.diamondCount <= tier.max
    ).length
  }));
}

/**
 * Searches gifts with enhanced filtering (name, description, price)
 * @param {Array} gifts - Array of gift objects
 * @param {string} query - Search query
 * @param {number} minPrice - Minimum price filter
 * @param {number} maxPrice - Maximum price filter
 * @returns {Array} Filtered gifts matching all criteria
 */
export function searchGiftsAdvanced(gifts, query = '', minPrice = 0, maxPrice = Infinity) {
  let filtered = gifts;
  
  // Apply price filter first
  if (minPrice > 0 || maxPrice < Infinity) {
    filtered = filterGiftsByPrice(filtered, minPrice, maxPrice);
  }
  
  // Apply search query
  if (query && query.trim()) {
    const searchTerm = query.toLowerCase().trim();
    filtered = filtered.filter(gift => 
      gift.name.toLowerCase().includes(searchTerm) ||
      (gift.description && gift.description.toLowerCase().includes(searchTerm))
    );
  }
  
  return filtered;
}

/**
 * Gets a gift by ID or name
 * @param {Array} gifts - Array of gift objects
 * @param {string} identifier - Gift ID or name
 * @returns {Object|null} Found gift object or null
 */
export function findGiftByIdentifier(gifts, identifier) {
  if (!identifier) return null;
  
  const searchTerm = identifier.toLowerCase().trim();
  return gifts.find(gift => 
    gift.id.toLowerCase() === searchTerm || 
    gift.name.toLowerCase() === searchTerm
  ) || null;
}

/**
 * Gets statistics about the gift catalog
 * @param {Array} gifts - Array of gift objects
 * @returns {Object} Statistics object
 */
export function getGiftCatalogStats(gifts) {
  if (!gifts.length) return { total: 0, priceRange: { min: 0, max: 0 }, averagePrice: 0 };
  
  const prices = gifts.map(g => g.diamondCount).filter(p => p > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  
  return {
    total: gifts.length,
    priceRange: { min: minPrice, max: maxPrice },
    averagePrice: Math.round(averagePrice * 100) / 100,
    freeGifts: gifts.filter(g => g.diamondCount === 0).length,
    premiumGifts: gifts.filter(g => g.diamondCount >= 100).length
  };
}
