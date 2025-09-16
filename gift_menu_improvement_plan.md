# Gift Menu Improvement Plan

## 1. Overview
The current *Select a Gift* modal shows **only 12 gifts** and uses **placeholder icons**. TikTok actually offers **200+ gifts**, each with a unique icon, name, and diamond price. We also need advanced filtering by **name** and **price point**.

## 2. Objectives
1. Display the **full TikTok gift catalog** (200+ gifts).
2. Render each gift with its **accurate icon**, **title**, and **diamond cost**.
3. Provide **filtering** capabilities:
   - **Search by name** (real-time, case-insensitive).
   - **Filter by price range** (min/max diamonds or predefined tiers).
4. Maintain smooth UX with **lazy rendering / pagination** to handle >200 items efficiently.
5. Preserve existing mapping workflow (click → add mapping).

## 3. Root-Cause Analysis
| Issue | Likely Cause |
|-------|--------------|
| Only 12 gifts displayed | Backend endpoint `/giftCatalog` currently returns a truncated list or the frontend limits rendering. |
| Wrong icons | Placeholder icons embedded in frontend; real icon URLs are present in the `gift.image` object from the live API but not propagated to the UI. |
| No price filtering | Feature not yet implemented. |

## 4. High-Level Solution
1. **Backend:** Ensure `/giftCatalog` returns the **complete gift list** with image URLs and diamond counts.
2. **Shared Types:** Define a `Gift` TS type `{ id, name, diamonds, imageUrl }` in `frontend/src/services/giftCatalog.js` (move to TS if needed).
3. **Frontend:**
   - Replace placeholder data with the real catalog fetched from the backend on modal open.
   - Use the `imageUrl` field for `<img>` source (fallback to placeholder if unavailable).
   - Implement **virtualized grid** (e.g., React-Window) or **pagination** (e.g., 50 per page).
4. **Filtering UI:**
   - **Search box** (already present) → wires into `filter.name`.
   - **Price filter:**
     - Slider (two-thumb range) *or* min/max numeric inputs.
     - Quick tier buttons (e.g., 1-9, 10-99, 100-999, 1000+ diamonds).
5. **State Management:** Local `useState` → `{ search, priceMin, priceMax }`. Derived `filteredGifts = gifts.filter(...)`.
6. **Performance Optimizations:**
   - Memoize filtered list (`useMemo`).
   - Debounce search input (300 ms).
   - Avoid re-rendering entire list via virtualization/pagination.
7. **Testing:** Unit + manual (see §7).

## 5. Detailed Task Breakdown
### 5.1 Backend (if needed)
- [ ] Confirm endpoint returns full catalog (≈ 200 gifts).
- [ ] Normalize data: `{ id, name, diamond_count, image.url }`.
- [ ] Cache catalog in memory (TTL 12 h) to avoid excessive API calls.

### 5.2 Frontend Data Layer
- [ ] Refactor `services/giftCatalog.js` → fetch from `/api/gifts` and cache.
- [ ] Expose hook `useGifts()` that returns `gifts`, `loading`, `error`.

### 5.3 GiftSelector Component
- [ ] Replace fixed array with data from `useGifts()`.
- [ ] Add **price slider** (`@headlessui/react` or custom).
- [ ] Implement filtering logic.
- [ ] Use **virtualized grid** (`react-window` `FixedSizeGrid`) for >200 items.
- [ ] Show total count: "**x gifts available**" after filtering.

### 5.4 UI / Styling
- [ ] Display diamond icon + count under each gift.
- [ ] Tooltip with full gift details on hover.
- [ ] Ensure responsive grid (auto-fill min-width 96 px).

### 5.5 Testing & QA
- **Unit Tests**:
  - Filtering function returns correct subset.
  - useGifts hook caches & refreshes correctly.
- **Manual Tests**:
  1. Modal opens → 200+ items visible (scroll/pagination works).
  2. Search "rose" → only Rose gift visible.
  3. Price filter 100-999 → gifts within that diamond range.
  4. Image fallback works when URL 404s.

### 5.6 Performance Benchmarks
- Time-to-modal-ready < 300 ms (cached data).
- Scroll at 60 fps in virtualized grid.

## 6. Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| TikTok API rate limits | Cache catalog on backend for 12 h. |
| Large payload size | Compress HTTP response; load lazily. |
| Broken image URLs | Use fallback placeholder. |

## 7. Timeline (Ideal)
| Day | Task |
|-----|------|
| 1 | Backend catalog endpoint & caching |
| 2 | Frontend hook + data layer |
| 3 | GiftSelector refactor with virtualization |
| 4 | Filtering UI, styling polish |
| 5 | Testing, bug-fix, merge |

---
**Total Estimation:** **~5 developer days**

## 8. Acceptance Criteria
- [ ] Modal shows full catalog (200+) with correct image, name, diamonds.
- [ ] Search filter returns correct results < 300 ms after typing.
- [ ] Price range filter works and updates count.
- [ ] Smooth scrolling without frame drops.
- [ ] No significant increase in initial bundle size (>100 KB).
