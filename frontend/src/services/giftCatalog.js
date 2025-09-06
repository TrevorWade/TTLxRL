// This module is intentionally minimal now.
// We removed all static or fallback gift catalogs.
// All icons come from live TikTok events only.

export function searchGifts(gifts, query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return gifts;
  return gifts.filter(g =>
    g.name?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q)
  );
}

export function findGiftByName(gifts, name) {
  if (!name) return null;
  const q = String(name).toLowerCase().trim();
  return gifts.find(g => g.name?.toLowerCase() === q) || null;
}

export function clearGiftCatalogCache() {
  // No-op: catalog removed
}
