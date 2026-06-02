# DM Panel UX/UI Audit & Recommendations

**Date**: 2026-06-02  
**Scope**: `/dm` panel visual design and information architecture  
**Current file sizes**: `DmPanel.jsx` (7.9k lines), `DmPanel.styles.css` (3.4k lines)

---

## Executive Summary

The DM panel is a **feature-complete control center** with 9 tabs (Cases, POIs, Villains, Evidence, Tracer, Live Map, RT Effects, Access, Campaign) but suffers from:

1. **No primary navigation strategy** — tabs are a flat list with no grouping
2. **Dense information layouts** — forms, lists, and editors packed tightly
3. **Visual hierarchy gaps** — similar styling for critical vs. secondary actions
4. **Mobile-hostile** at 980px breakpoint (forms break into single-column)
5. **No search/filter across large datasets** (50+ cases, 100+ POIs, 50+ villains)
6. **Inconsistent card/panel spacing** — edges sometimes cramped
7. **Modal/overlay behavior unclear** — quick-create, editor dialogs compete for attention
8. **RT Effects tab integrates well, but 9-tab layout is at capacity**

---

## Current Structure

### Navigation Tabs (9)
1. **Casos** — Case tree + details + form
2. **POIs** — POI list + map picker + quick-create + editor
3. **Villanos** — Villain list + details + form
4. **Evidencias** — Evidence list + metadata + uploader
5. **Tracer** — Phone lines + hotspots + map controls
6. **Mapa Live** — Tactical backgrounds + token editor
7. **Efectos RT** — Effect buttons + media uploader (NEW)
8. **Accesos** — Access control matrix + unlock config
9. **Campaña** — Campaign state + flags + active case

### Layout Model
- **Header**: Auth info, logout
- **Sidebar** (if implemented): Would need restructuring
- **Main**: Max-width 1280px (responsive down to 700px)
- **Modals**: Quick-create dialogs, fullscreen editors (POI, Villain)
- **Hint system**: Inline label rows with icons

---

## Issues & Opportunities

### 🔴 Critical

#### 1. **Navigation Overload — 9 Tabs at Capacity**

**Problem**: 
- All 9 tabs fit horizontally, but barely (depending on font/browser)
- No visual grouping (operational vs. config vs. campaign)
- No search across resources
- New feature always means another tab

**Opportunity**:
- **Organize into 3-4 logical groups** with collapsible submenu or secondary nav:
  - **DATA**: Casos, POIs, Villanos, Evidencias (CRUD-heavy)
  - **OPERATIONS**: Tracer, Mapa Live, Efectos RT (live, real-time)
  - **CONFIG**: Accesos, Campaña (state, flags, unlock rules)
- **Add a search/filter bar** at the top (case/POI/villain search)
- **Tab overflow strategy**: When too many tabs, use dropdown or scrollable tab bar

**Example structure**:
```
┌─────────────────────────────────────────────┐
│  DM Panel  [Profile] [Logout]              │
├─────────────────────────────────────────────┤
│ Search: [_______________________] 🔍         │
│ ┌─ DATA ────────────────────┐ ┌─ OPS ──────┐ ┌─ CONFIG ──────┐
│ │ > Casos                   │ │ > Tracer   │ │ > Accesos     │
│ │ > POIs                    │ │ > Mapa Live│ │ > Campaña     │
│ │ > Villanos  [NEW!]        │ │ > Efectos  │ │               │
│ │ > Evidencias              │ │            │ │               │
│ └───────────────────────────┘ └────────────┘ └───────────────┘
│ ┌─────────────────────────────────────────────────────────┐
│ │ [Active tab content]                                    │
│ └─────────────────────────────────────────────────────────┘
```

---

#### 2. **No Global Search**

**Problem**:
- To find a case, POI, or villain, you must manually browse the list
- Lists are unsorted / no filter controls
- Large campaigns (50+ cases, 100+ POIs) = scroll hell

**Opportunity**:
- **Global search bar** in header (with autocomplete by type):
  - Types: case, POI, villain, evidence
  - Fuzzy match on name, ID, tags
  - Hotkey: Ctrl+K or Cmd+K
  - Shows top 5 results → click to jump and select

```
┌─────────────────────────────────────────────┐
│ 🔍 Search cases, POIs, villains...         │
├─────────────────────────────────────────────┤
│ CASO — La Masacre en Amusement Park       │
│ POI  — Wayne Tower (28 elementos)         │
│ CASO — Asesinato de Marcus Chen           │
│ PNJS — Two-Face                           │
│ PNJS — Penguin                            │
└─────────────────────────────────────────────┘
```

---

#### 3. **Dense Form Layouts**

**Problem**:
- Forms are column-based but lack breathing room
- Labels + hints + inputs packed closely
- No visual separation between form sections
- `labelRow()` helper adds icons, but layout is cramped

**Opportunity**:
- **Increase grid gaps**: `gap: 0.6rem` → `gap: 0.9rem` (between form groups)
- **Add background cards per section**: Each `.dm-panel__form-group` gets subtle background `rgba(124,255,178,0.03)`
- **Improve label/hint visibility**:
  - Make hint text smaller, lighter color (already done)
  - **Add a "?" icon tooltip** for complex fields (instead of inline text)
- **Responsive form layout**:
  - At 1100px+: 2-column form grids where sensible (name+status side-by-side)
  - At <1100px: stack to 1 column (already done, but tighten spacing)

```css
/* BEFORE */
.dm-panel__form-group { gap: 0.3rem; }

/* AFTER */
.dm-panel__form-group {
  gap: 0.6rem;
  padding: 0.8rem;
  background: rgba(124, 255, 178, 0.02);
  border-radius: 4px;
  border-left: 2px solid rgba(124, 255, 178, 0.15);
}
```

---

### 🟡 High Priority

#### 4. **Modal/Dialog Behavior Unclear**

**Problem**:
- Multiple overlapping dialogs: quick-create POI, POI fullscreen editor, villain editor, etc.
- No clear visual hierarchy (all use same overlay)
- No animation/transition on open/close
- ESC key handling works, but not obvious

**Opportunity**:
- **Distinguish modal types**:
  - **Quick modals** (small): Quick-create POI → use a centered card, semi-transparent overlay, can dismiss with ESC
  - **Fullscreen editors**: POI/Villain details → full viewport, sidebar or slide-out from right
  - **Panels**: Evidence uploader, access matrix → docked to side or tab-like

```
Quick Modal (centered):        Fullscreen (right slide-out):
┌──────────────────────┐       Main view | ┌──────────────────┐
│ ┌────────────────────┐│       scrolls  | │ POI Editor       │
│ │ Crear POI Rápido   ││                │ ├──────────────────┤
│ │ [Nombre] [Mapa]    ││                │ │ Details          │
│ │ [Guardar] [Cancelar]│                │ │ Resources        │
│ │ ESC to close       ││                │ │ Media            │
│ └────────────────────┘│                │ │ [Save] [Close]   │
└──────────────────────┘       [X button]│ └──────────────────┘
```

- **Add smooth transitions**: `transition: opacity 120ms, transform 160ms ease`
- **Show keyboard hints**: "ESC to close" in footer or near close button

---

#### 5. **Color Consistency & Button Hierarchy**

**Problem**:
- **Danger buttons** (red) used for "Eliminar", "Limpiar" — not always obvious they're destructive
- **Primary action buttons** (save/create) and **secondary** (cancel) not visually distinct enough
- **Ghost buttons** (link-like) only used in some places
- Button styling varies: padding, border, shadow

**Opportunity**:
- **Standardize button roles**:

| Role | Color | Example |
|------|-------|---------|
| **Primary** (save, create) | Green border + hover bg | "Guardar", "Crear POI" |
| **Secondary** (cancel, reset) | Gray border + transparent | "Cancelar", "Limpiar selección" |
| **Danger** (delete, clear effects) | Red border + red text | "Eliminar", "Limpiar todos" |
| **Ghost** (expand, link-like) | No border, green text | "Expandir mapa", "Editar" |

```css
.dm-panel__btn--primary {
  border-color: #2ddc93;
  color: #2ddc93;
}
.dm-panel__btn--primary:hover {
  background: rgba(45, 220, 147, 0.12);
  box-shadow: 0 0 10px rgba(45, 220, 147, 0.18);
}

.dm-panel__btn--danger {
  border-color: #ff6b6b;
  color: #ff6b6b;
}
.dm-panel__btn--danger:hover {
  background: rgba(255, 107, 107, 0.12);
  box-shadow: 0 0 10px rgba(255, 107, 107, 0.2);
}
```

- **Add disabled state visuals**: Gray out text + border, reduce opacity to 0.4
- **Button grouping**: Group related buttons (Save/Cancel side-by-side, not stacked)

---

#### 6. **Missing Loading/Error States**

**Problem**:
- Loading indicators (`setXxxLoading`) exist in state but CSS doesn't show them clearly
- No visual feedback when form submission is in progress
- Error messages (`setXxxMessage`) appear inline, but styling is subtle

**Opportunity**:
- **Loading state on buttons**:
  ```jsx
  <button disabled={xxxLoading}>
    {xxxLoading ? '⏳ Guardando...' : 'Guardar'}
  </button>
  ```
- **Inline error toast** (instead of form text):
  ```css
  .dm-panel__toast {
    position: fixed; top: 1rem; right: 1rem;
    background: rgba(255, 107, 107, 0.15);
    border: 1px solid rgba(255, 107, 107, 0.4);
    color: #ff9999;
    padding: 0.8rem 1.2rem;
    border-radius: 6px;
    animation: slideIn 200ms ease;
  }
  ```
- **Loading spinner inside form**:
  ```jsx
  {xxxLoading && <div className="dm-panel__spinner">◌ Cargando...</div>}
  ```

---

#### 7. **POI Map Picker UX**

**Problem**:
- Map picker is large and takes up vertical space
- No zoom indicator or coordinate display while hovering
- "Expandir mapa" button is hidden below the map preview
- Can't see full POI details while editing location

**Opportunity**:
- **Compact POI editor layout**:
  - Left column: Form (name, status, tags, etc.)
  - Right column: Compact map (250px × 350px) + coordinate input boxes
  - Full-screen editor as separate modal (already exists, but use it more)
- **Add coordinate input fields** below/beside map:
  ```jsx
  <div className="dm-panel__coord-inputs">
    <input type="number" placeholder="X %" value={x} />
    <input type="number" placeholder="Y %" value={y} />
    <input type="number" placeholder="Radius" value={radius} />
  </div>
  ```
- **Hover tooltip**: Show coordinates on map hover (X%, Y%, Radius%)

---

### 🟢 Medium Priority

#### 8. **RT Effects Panel Spacing**

**Problem**:
- New RT Effects tab uses lots of button rows (7-8 buttons per group)
- Buttons wrap on smaller screens, reducing readability
- Log section is scrollable but has no visible scrollbar styling

**Opportunity**:
- **Organize effect buttons into button groups** (already done, good!)
- **Add visual separators** between effect groups:
  ```css
  .rt-effects-group {
    border-bottom: 1px solid rgba(124, 255, 178, 0.1);
    padding-bottom: 1.2rem;
  }
  ```
- **Style scrollbar** on log section:
  ```css
  .rt-effects-log::-webkit-scrollbar {
    width: 6px;
  }
  .rt-effects-log::-webkit-scrollbar-thumb {
    background: rgba(124, 255, 178, 0.3);
    border-radius: 3px;
  }
  ```

---

#### 9. **Evidence & Ballistics Preview**

**Problem**:
- Ballistics canvas previews are side-by-side but not labeled (left = what? right = what?)
- Evidence thumbnails are small, hard to see
- No fullscreen preview for images/videos

**Opportunity**:
- **Add labels above ballistics canvases**:
  ```jsx
  <div className="dm-panel__ballistics-pair">
    <div className="dm-panel__ballistics-item">
      <label className="dm-panel__label">Imagen izquierda</label>
      <canvas ref={ballisticsPreviewLeftRef} />
    </div>
    <div className="dm-panel__ballistics-item">
      <label className="dm-panel__label">Imagen derecha</label>
      <canvas ref={ballisticsPreviewRightRef} />
    </div>
  </div>
  ```
- **Lightbox for evidence**: Click thumbnail → fullscreen modal with metadata

---

#### 10. **Live Map Token Editor**

**Problem**:
- Token form (label, kind, visibility) is inline with the map
- No clear distinction between creating vs. editing a token
- Trail visualization only in map, not in editor

**Opportunity**:
- **Split into two modes**:
  - **Select mode**: Click token on map → shows details in sidebar
  - **Edit mode**: Form expands with Save/Cancel buttons
- **Show preview of trail** in the form (small timeline or color box)
- **Keyboard shortcut**: When a token is selected, arrow keys move it + live broadcast

---

### 🟦 Nice-to-Have

#### 11. **Accessibility**

**Problem**:
- ARIA labels missing on many interactive elements
- No focus indicators (keyboard nav not obvious)
- Color contrast OK but could be higher for accessibility

**Opportunity**:
- Add `aria-label` to all buttons, inputs, tabs
- Visible focus ring: `:focus { outline: 2px solid #2ddc93; }`
- Tab order: Ensure logical tab flow (left-to-right, top-to-bottom)

---

#### 12. **Dark Mode** (if needed)

Currently the panel is dark-themed (green/cyan text on dark bg). **No action needed** unless you want a light mode fallback.

---

## Implementation Roadmap

### Phase 1: Quick Wins (1–2 hours)
- [ ] Add global search bar (header)
- [ ] Group tabs into 3 sections (DATA, OPS, CONFIG)
- [ ] Increase form group spacing & add subtle backgrounds
- [ ] Standardize button roles (primary/secondary/danger/ghost)

### Phase 2: Medium Effort (2–3 hours)
- [ ] Improve modal/dialog animations and hierarchy
- [ ] Add loading/error toasts
- [ ] Refine POI map picker (coordinate inputs, hover tooltip)
- [ ] Add scrollbar styling to lists/logs

### Phase 3: Polish (2–3 hours)
- [ ] RT Effects button group separators
- [ ] Evidence/Ballistics preview labels & lightbox
- [ ] Live Map token editor split-view (select vs. edit)
- [ ] Accessibility pass (ARIA labels, focus states)

---

## Design Tokens to Establish

```css
/* Spacing */
--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;
--spacing-md: 0.8rem;
--spacing-lg: 1.2rem;
--spacing-xl: 1.6rem;

/* Colors */
--color-primary: #2ddc93;   /* Green */
--color-secondary: #b4ffe4; /* Light cyan */
--color-danger: #ff6b6b;    /* Red */
--color-warning: #e8c96a;   /* Amber */
--color-bg-base: #020709;
--color-bg-card: rgba(124, 255, 178, 0.03);
--color-border: rgba(124, 255, 178, 0.15);

/* Typography */
--font-mono: 'Share Tech Mono', monospace;
--font-size-label: 0.75rem;
--font-size-body: 0.85rem;
--font-size-title: 1rem;

/* Transitions */
--transition-fast: 120ms ease;
--transition-normal: 160ms ease;
--transition-slow: 240ms ease;

/* Z-index stack */
--z-content: 10;
--z-modal: 50;
--z-effect-overlay: 75-90;
--z-modal-fullscreen: 100;
```

---

## Summary Table

| Issue | Severity | Effort | Impact |
|-------|----------|--------|--------|
| Navigation overload (9 tabs) | 🔴 | M | High — scalability + UX |
| No global search | 🔴 | M | High — discoverability |
| Dense form layouts | 🔴 | S | Medium — readability |
| Modal hierarchy unclear | 🟡 | M | Medium — focus |
| Button inconsistency | 🟡 | S | Low — clarity |
| Missing loading states | 🟡 | S | Medium — feedback |
| POI map picker UX | 🟡 | M | Medium — workflow |
| RT Effects log styling | 🟢 | S | Low — polish |
| Evidence preview | 🟢 | M | Low — nice-to-have |
| Live Map token editor | 🟢 | M | Low — nice-to-have |
| Accessibility | 🟦 | M | Medium — compliance |

---

## Next Steps

1. **Get stakeholder feedback** on navigation grouping (Phase 1)
2. **Prototype the search bar** and group tabs in Figma/browser
3. **Prioritize Phase 1 quick wins** for visible impact
4. **Then tackle Phase 2** (modal UX, form polish)
5. **Phase 3 is polish** — do after core UX is solid
