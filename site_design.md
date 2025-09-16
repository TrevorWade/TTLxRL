# Site Design Plan

## 1. Vision & Objectives
- Deliver a fresh, TikTok-inspired interface.
- Place the **Live Feed** at the top-right.
- Place the **Mapping** view to the left of the Live Feed.
- Keep both views in clearly separated, visually balanced sections.
- Maintain responsiveness and accessibility.

## 2. TikTok Brand Guidelines
| Element | Value | Usage |
|---------|-------|-------|
| Primary Background | `#000000` (Black) | Main page background, dark sections |
| Accent Red | `#FE2C55` | Action buttons, hover states |
| Accent Cyan | `#25F4EE` | Secondary highlights, icons |
| Accent Pink | `#FF0050` | Gradient accents, progress bars |
| Contrast White | `#FFFFFF` | Text on dark backgrounds |
| Gray 700 | `#333333` | Card backgrounds, dividers |

**Typography**
- _TikTok Sans Pro_ (preferred) → fallback to `Poppins`, then `sans-serif`.
- Font weights: 400 (regular), 600 (semi-bold).

## 3. High-Level Layout
```mermaid
graph TD
  A[Header]
  B[Mapping Section \n(left)]
  C[Live Feed Section \n(right)]
  D[Footer]
  A --> B
  A --> C
  B --> D
  C --> D
```

### Desktop (≥1024 px)
- **Grid:** `grid-cols-[60%_40%]` using CSS Grid or Tailwind `grid grid-cols-5` with `col-span-3` for Mapping and `col-span-2` for Live Feed.
- **Height:** Both sections full-height minus header/footer.
- **Section Separation:** Thin cyan left border on Live Feed; subtle gray divider between sections.

### Tablet (768-1023 px)
- **Stacked Grid:** `grid-cols-1` with Mapping on top, Live Feed below for clarity.
- Provide toggle buttons to switch positions if desired.

### Mobile (<768 px)
- **Full-Width Stack:** Mapping first, Live Feed second.
- Collapse non-essential controls into a bottom sheet.

## 4. Component Breakdown
1. **Header**
   - Logo (TikTok note icon style) left.
   - Page title centre.
   - Settings / Help icons right.
2. **MappingSection** (`<MappingSection />`)
   - Occupies left grid area.
   - Uses `mapbox-gl` or existing mapping lib.
   - Overlay for location pins styled in accent cyan.
3. **LiveFeedSection** (`<LiveFeedSection />`)
   - Occupies right grid area.
   - Stream preview window with rounded corners.
   - Chat overlay with translucent dark background.
4. **LikeCounter** (`<LikeCounter />`)
   - Renders inside the LiveFeedSection header.
   - Shows big red heart icon + total like count (`text-4xl`, color `#FE2C55`).
   - `aria-live="polite"` so screen readers announce updates.
5. **LikeTriggerPanel** (`<LikeTriggerPanel />`)
   - Fixed at bottom-right of the Live Feed area (or collapsible drawer on mobile).
   - Lets users add “Every N likes → press key” rules.
   - Minimal UI: list of triggers, Add / Remove buttons, reset counts.
6. **Footer**
   - Minimal; copyright notice & version.

## 5. Interaction & Animations
- Hover on map pins → scale-up + accent red shadow.
- Live feed new message → slide-in from bottom with fade.
- Section load animations → subtle upward fade using Tailwind `animate-fadeInUp`.

## 6. Responsiveness Strategy
- Use **Tailwind** breakpoints: `sm`, `md`, `lg`, `xl`.
- Avoid fixed heights; rely on `min-h-screen` & `flex`.
- Test on Chrome DevTools device toolbar.

## 7. Accessibility Checklist
- WCAG AA contrast ratios for text vs backgrounds.
- Keyboard navigable controls.
- `aria-label` on interactive icons.
- Caption support in live videos.

## 8. Implementation Steps
1. **Create Layout Shell**
   - Update `App.jsx` to wrap content in `<MainLayout>` with CSS Grid.
2. **Build MappingSection Component**
   - Extract mapping logic from current implementation into its own component.
3. **Build LiveFeedSection Component**
   - Integrate existing WebSocket feed (`ws.ts`) into new component.
4. **Apply Theme**
   - Configure Tailwind `theme.extend.colors` with TikTok palette.
   - Set global font-family in `index.css`.
5. **Add Animations**
   - Install `tailwindcss-animate` plugin.
6. **QA & Accessibility Testing**
   - Lighthouse audit, fix issues.
7. **User Acceptance Testing**
   - Deploy preview build, solicit feedback.

## 9. Timeline & Milestones
| Week | Task |
|------|------|
| 1 | Layout shell & theme integration |
| 2 | MappingSection refactor |
| 3 | LiveFeedSection development |
| 4 | Animations & responsiveness |
| 5 | Accessibility fixes & QA |
| 6 | UAT & final polish |

## 10. Future Enhancements
- Dark-mode color variants (automatic with OS setting).
- Drag-and-drop section rearrangement.
- Live feed reaction emojis floating overlay.

---
End of plan.
