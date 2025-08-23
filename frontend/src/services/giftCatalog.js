/**
 * Gift Catalog Service
 * Fetches and caches TikTok gift catalog for visual gift selection
 * Uses localStorage for caching to avoid repeated API calls
 */

const GIFT_CATALOG_KEY = 'tiktok_gift_catalog';
const GIFT_CATALOG_TIMESTAMP_KEY = 'tiktok_gift_catalog_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetches the gift catalog from backend or cache
 * @param {boolean} forceRefresh - Skip cache and fetch fresh data
 * @returns {Promise<Array>} Array of gift objects with id, name, imageUrl, diamondCount
 */
export async function fetchGiftCatalog(forceRefresh = false) {
  try {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cachedData = getCachedGiftCatalog();
      if (cachedData) {
        console.log('Using cached gift catalog');
        return cachedData;
      }
    } else {
      console.log('Force refresh requested, skipping cache');
    }

    console.log('Fetching fresh gift catalog from backend...');
    
    // Try to fetch from backend
    const response = await fetch('http://localhost:3001/api/gifts/catalog');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const giftCatalog = await response.json();
    
    // Cache the result
    cacheGiftCatalog(giftCatalog);
    
    console.log(`Fetched ${giftCatalog.length} gifts from catalog`);
    return giftCatalog;
    
  } catch (error) {
    console.warn('Failed to fetch gift catalog:', error.message);
    
    // Return fallback gifts if API fails
    return getFallbackGifts();
  }
}

/**
 * Gets cached gift catalog if it exists and is still valid
 * @returns {Array|null} Cached gift catalog or null if expired/missing
 */
function getCachedGiftCatalog() {
  try {
    const timestamp = localStorage.getItem(GIFT_CATALOG_TIMESTAMP_KEY);
    const cachedData = localStorage.getItem(GIFT_CATALOG_KEY);
    
    if (!timestamp || !cachedData) {
      return null;
    }
    
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_DURATION) {
      // Cache expired, remove it
      localStorage.removeItem(GIFT_CATALOG_KEY);
      localStorage.removeItem(GIFT_CATALOG_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cachedData);
  } catch (error) {
    console.warn('Error reading cached gift catalog:', error);
    return null;
  }
}

/**
 * Caches gift catalog to localStorage
 * @param {Array} giftCatalog - Gift catalog to cache
 */
function cacheGiftCatalog(giftCatalog) {
  try {
    localStorage.setItem(GIFT_CATALOG_KEY, JSON.stringify(giftCatalog));
    localStorage.setItem(GIFT_CATALOG_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Failed to cache gift catalog:', error);
  }
}

/**
 * Returns fallback gift list when API is unavailable
 * Uses common TikTok gifts with placeholder images
 * @returns {Array} Fallback gift list
 */
function getFallbackGifts() {
  return [
    {
      id: 'star',
      name: 'Star',
      imageUrl: null,
      diamondCount: 1,
      description: 'Basic star gift'
    },
    {
      id: 'rose',
      name: 'Rose',
      imageUrl: null,
      diamondCount: 1,
      description: 'Beautiful rose'
    },
    {
      id: 'letcook',
      name: "Let 'Em Cook",
      imageUrl: null,
      diamondCount: 5,
      description: 'Cooking celebration'
    },
    {
      id: 'gg',
      name: 'GG',
      imageUrl: null,
      diamondCount: 1,
      description: 'Good game'
    },
    {
      id: 'gamecontroller',
      name: 'Game Controller',
      imageUrl: null,
      diamondCount: 10,
      description: 'Gaming controller'
    },
    {
      id: 'heartsuperstage',
      name: 'Heart Superstage',
      imageUrl: null,
      diamondCount: 100,
      description: 'Premium heart gift'
    },
    {
      id: 'heartstage',
      name: 'Heart Stage',
      imageUrl: null,
      diamondCount: 50,
      description: 'Stage heart effect'
    },
    {
      id: 'heartitout',
      name: 'Heart It Out',
      imageUrl: null,
      diamondCount: 25,
      description: 'Heart explosion'
    },
    {
      id: 'iheartyou',
      name: 'iHeart You',
      imageUrl: null,
      diamondCount: 15,
      description: 'Love expression'
    },
    {
      id: 'goldengamepad',
      name: 'Golden Gamepad',
      imageUrl: null,
      diamondCount: 500,
      description: 'Premium gaming gift'
    },
    {
      id: 'imnewhere',
      name: "I'm New Here",
      imageUrl: null,
      diamondCount: 1,
      description: 'Welcome gift'
    },
    {
      id: 'hifriend',
      name: 'Hi Friend',
      imageUrl: null,
      diamondCount: 1,
      description: 'Friendly greeting'
    }
  ];
}

/**
 * Searches gifts by name (case-insensitive)
 * @param {Array} gifts - Array of gift objects
 * @param {string} query - Search query
 * @returns {Array} Filtered gifts matching the query
 */
export function searchGifts(gifts, query) {
  if (!query || !query.trim()) {
    return gifts;
  }
  
  const searchTerm = query.toLowerCase().trim();
  return gifts.filter(gift => 
    gift.name.toLowerCase().includes(searchTerm) ||
    (gift.description && gift.description.toLowerCase().includes(searchTerm))
  );
}

/**
 * Finds a gift by name (case-insensitive exact match)
 * @param {Array} gifts - Array of gift objects
 * @param {string} name - Gift name to find
 * @returns {Object|null} Found gift object or null
 */
export function findGiftByName(gifts, name) {
  if (!name) return null;
  
  const searchName = name.toLowerCase().trim();
  return gifts.find(gift => gift.name.toLowerCase() === searchName) || null;
}

/**
 * Clears the cached gift catalog (useful for debugging or forcing refresh)
 */
export function clearGiftCatalogCache() {
  localStorage.removeItem(GIFT_CATALOG_KEY);
  localStorage.removeItem(GIFT_CATALOG_TIMESTAMP_KEY);
  console.log('Gift catalog cache cleared');
}
