### Goal

Add a “Browse gifts” button to the Add Gift Mapping window so users can select from every TikTok gift. The grid must display, for each gift: the official TikTok icon, the gift name, and the diamond cost. Icons must come from the same TikTok CDN fields used by the live feed. No placeholder or random images; if an icon cannot be resolved from TikTok data, that gift should not be shown.

### Non‑negotiable requirements
- **Icon source parity**: Use the same resolution logic as the live feed: prefer `giftPictureUrl`, then `giftImageUrl`, then `gift.pictureUrl`. For catalog entries that come from TikTok’s gift list JSON, also check `icon.url_list[0]` then `image.url_list[0]`. Do not display any fallback or placeholder.
- **All gifts**: Show the full catalog (thousands of gifts) with name and `diamond_count`.
- **Performance**: The grid should be fast and responsive (virtualized list, lazy image loading).

---

## Data model and sources

- Primary source for a complete list: fetched on demand from TikTok’s Live APIs (same backend session used for the live connection). These endpoints return objects with fields like `id`, `name`, `diamond_count`, `icon.url_list`, `image.url_list`.
- Live feed parity: our backend (`backend/index.js`) already resolves event icons using TikTok event fields.

We will unify these via a single “official icon resolver” that understands the fields returned by both live events and the remote gift list and returns a TikTok CDN URL or `null`.

### Unified icon resolver (no placeholders)

Resolution precedence (first non-empty wins):
1. `giftPictureUrl`
2. `giftImageUrl`
3. `gift.pictureUrl`
4. `icon.url_list[0]`
5. `image.url_list[0]`

If all are missing → exclude the gift from the browse grid. This guarantees we never invent icons.

---

## Backend changes (WS-based catalog delivery)

Why: Keep the icon parity in one place and avoid drift between live events and catalog. The backend already resolves icons for live events; we’ll reuse the same logic for the full catalog fetched from TikTok.

1) Add a catalog fetcher in `backend/index.js`:
- Implement `async fetchGiftCatalogFromTikTok()`: call TikTok’s Live API endpoints (same region/aid as `WebcastPushConnection`) to retrieve the full gift list available to the current session/region.
- Transform each entry to `{ id, name, diamondCount, imageUrl }` using the unified resolver above (`icon.url_list[0]` or `image.url_list[0]`; and when events are involved: `giftPictureUrl`, `giftImageUrl`, `gift.pictureUrl`).
- Filter out entries where `imageUrl` is `null` (strict no-fallback rule).
- Cache the transformed array in-memory with a TTL (e.g., 6 hours) and expose `lastFetchedMs`.

2) Extend WS protocol:
- Request: `{ type: 'get-gift-catalog' }`
- Response: `{ type: 'gift-catalog', items: Gift[], total: number, lastFetchedMs }`

3) Optional enrichment:
- Merge in `dynamicGiftCatalog` entries (already collected from live events) by lowercased gift name; if a dynamic entry has a valid `imageUrl`, prefer it over the API-provided one (still a TikTok URL).

4) Guard rails:
- If remote fetch fails or returns an unexpected payload, respond with `{ type: 'gift-catalog', items: [], total: 0 }` (do not fabricate data).

---

## Frontend changes

### 1) UI: Add the Browse button in `GiftMappingModal.jsx`
- Place a compact, secondary button to the right of the gift name input.
- Label: “Browse gifts”.
- Clicking opens the existing `GiftSelector` modal (we already have a component) configured for a large, scrollable, virtualized grid.

### 2) Data flow into the selector
- On first open of the selector, request the catalog via WS: `send({ type: 'get-gift-catalog' })`.
- Handle one-shot response `{ type: 'gift-catalog' }` and store it in component state (or a simple React context/cache to reuse across openings).
- Pass the list to `GiftSelector` via its `giftCatalog` prop.

### 3) Rendering rules in `GiftSelector`
- Render a grid card for each gift with:
  - Image: `<img src={gift.imageUrl} />` (no onError placeholder; if it fails at runtime, hide image for that card).
  - Name: `gift.name` (trimmed, title-cased if desired).
  - Cost: `gift.diamondCount` with a coin/diamond icon.
- Support search by name and optional filters (price tiers are already available in services if needed).
- Use list virtualization (e.g., `react-window`), or a simple virtualized grid with CSS `content-visibility: auto` and lazy image loading (`loading="lazy"`).

### 4) Selection wiring
- When a user clicks a card, close the selector and set `selectedGift` in `GiftMappingModal.jsx` to `{ name, imageUrl, diamondCount }`. This already flows into the save handler and preview.

---

## Implementation steps (ordered)

1. Backend: add unified icon resolver function.
- Location: `backend/index.js` (top-level util section) or a tiny helper file.
- Implementation: check fields in the precedence listed above, return the first URL string or `null`.

2. Backend: implement catalog loader and cache.
- Fetch the remote gift list via TikTok Live API once per TTL; transform using resolver.
- Merge with `dynamicGiftCatalog` (prefer dynamic `imageUrl` if present).
- Store `catalogCache = { items: Gift[], lastFetchedMs: number }`.

3. Backend: add WS handlers.
- On `{ type: 'get-gift-catalog' }` → ensure cache is loaded → `ws.send({ type: 'gift-catalog', items, total: items.length, lastModifiedMs })`.

4. Frontend: wire Browse button.
- In `GiftMappingModal.jsx`, add a button to the right of the gift name input that toggles `showGiftSelector`.
- When opening and catalog not loaded, send WS request; store result locally.

5. Frontend: plug catalog into `GiftSelector`.
- Pass `giftCatalog={catalogItems}` to the selector.
- Ensure each card uses `gift.imageUrl` directly and does not render a placeholder if the image 404s.

6. Frontend: selection handling.
- On card click, call the existing `onSelectGift(gift)` behavior to propagate `{ name, imageUrl, diamondCount }` back to the modal.

7. UX polish
- Add a small helper text under the input: “Type an exact gift name or browse all gifts”.
- Keep keyboard shortcuts (Esc to close; Enter to save).

---

## Performance and reliability

- Catalog size can be large (thousands). Use one-time WS fetch + in-memory cache on the frontend.
- Render virtualization to keep the DOM light.
- Use `loading="lazy"` and fixed-size image containers for smooth scrolling.
- Do not retry failed images with placeholders; simply don’t render an image for that card (spec requires no fallback).

---

## Testing checklist

- Backend returns only entries with non-null `imageUrl` and valid `diamondCount` numbers.
- Spot-check several random gifts against TikTok UI to confirm icon and name match.
- Live feed and selector show the same icon URL for a gift that’s sent during testing (parity check).
- Selector search filters correctly by name; optional price filters behave as expected.
- Selecting a gift populates `selectedGift` in `GiftMappingModal.jsx` and saves with `imageUrl`.

---

## Acceptance criteria

- A Browse button appears to the right of the gift name input in the Add Gift Mapping modal.
- Clicking Browse opens a grid of all TikTok gifts with icon, name, and cost.
- Every displayed icon URL is from TikTok’s CDN resolved by the unified logic; no placeholders.
- Selecting a gift fills the modal with that gift’s name and retains `imageUrl` for the mapping.
- Performance remains smooth for large catalogs.

---

## Post‑merge follow‑ups (optional)

- Add local persistence of the catalog in `localStorage` with a short TTL to avoid re-fetching on reloads.
- Add pagination or server-side search if we later expose advanced filters.


