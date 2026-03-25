# ERP Style Guide — Visual Identity & Design Token System

This document defines the visual identity, color palette, typography, and CSS custom property system for the Elysium Rising mmorPg. All frontend and admin code should reference these design tokens rather than hardcoded values.

---
*Last Updated: 2026-02-28*

## 1. Visual Identity

### 1.1 Core Aesthetic: "Cyberpunk Meets Cosmic Horror"

The visual identity is derived directly from the *Towers of Elysium* book cover and the trilogy's themes:

- **Deep cosmic darkness** as the foundation — black voids, subtle nebula textures
- **Crimson/red** as the primary identity color — cosmic horror, urgency, the Eternal Engine's power
- **Cyan/teal** as the technology color — interfaces, data, constructed realities, glowing grids
- **Gold** as a premium accent — achievements, special items, rare elements (reduced role)
- **Grid/matrix patterns** — representing the constructed reality of Etheris
- **Nebula gradients** — swirling crimson-to-dark transitions for backgrounds
- **Glowing concentric rings** — referencing the book cover's portal imagery
- **Translucent entities** — ghostly overlays for cosmic beings and The Pointers

### 1.2 What This Is NOT

- NOT medieval fantasy (no stone textures, no parchment, no sword-and-shield iconography)
- NOT generic dark mode (intentional color choices, not just "white text on black")
- NOT neon cyberpunk (more cosmic horror than *Cyberpunk 2077* — muted, dread-filled)

---

## 2. Color Palette

### 2.1 Primary Colors

| CSS Variable | Value | Swatch | Usage |
|-------------|-------|--------|-------|
| `--color-primary` | `#c41e3a` | Crimson | Primary brand color, CTA buttons, story elements, horror accents, titles |
| `--color-primary-hover` | `#d92547` | Light crimson | Hover states for primary elements |
| `--color-primary-muted` | `rgba(196, 30, 58, 0.15)` | Crimson glass | Subtle backgrounds, card tints |
| `--color-secondary` | `#00d4ff` | Cyan/Teal | Tech elements, links, interface highlights, step indicators |
| `--color-secondary-hover` | `#33ddff` | Light cyan | Hover states for secondary elements |
| `--color-secondary-muted` | `rgba(0, 212, 255, 0.15)` | Cyan glass | Subtle tech backgrounds |
| `--color-accent` | `#d4af37` | Gold | Premium/achievement elements, special highlights, XP/level indicators |
| `--color-accent-hover` | `#e0c050` | Light gold | Hover states for accent elements |
| `--color-accent-muted` | `rgba(212, 175, 55, 0.15)` | Gold glass | Subtle premium backgrounds |

### 2.2 Background Colors

| CSS Variable | Value | Usage |
|-------------|-------|-------|
| `--color-bg-deep` | `#0a0a14` | Page-level backgrounds, the cosmic void |
| `--color-bg-surface` | `#111122` | Cards, panels, content containers |
| `--color-bg-elevated` | `#1a1a2e` | Elevated surfaces, hover states, modals |
| `--color-bg-input` | `#0d0d1a` | Form inputs, text areas |
| `--color-bg-overlay` | `rgba(0, 0, 0, 0.85)` | Modal overlays, backdrop filters |
| `--color-bg-black` | `#000000` | True black for maximum contrast areas |

### 2.3 Text Colors

| CSS Variable | Value | Usage |
|-------------|-------|-------|
| `--color-text-primary` | `rgba(255, 255, 255, 0.87)` | Body text, primary content |
| `--color-text-secondary` | `#aaaaaa` | Secondary text, labels, descriptions |
| `--color-text-muted` | `#666666` | Disabled text, timestamps, metadata |
| `--color-text-inverse` | `#000000` | Text on light/colored backgrounds |

### 2.4 Border Colors

| CSS Variable | Value | Usage |
|-------------|-------|-------|
| `--color-border-subtle` | `#222233` | Default card/panel borders |
| `--color-border-medium` | `#333344` | Input borders, dividers |
| `--color-border-strong` | `#444455` | Emphasized borders, hover states |
| `--color-border-primary` | `rgba(196, 30, 58, 0.3)` | Crimson-tinted borders for story/horror elements |
| `--color-border-secondary` | `rgba(0, 212, 255, 0.3)` | Cyan-tinted borders for tech elements |

### 2.5 Semantic / Status Colors

| CSS Variable | Value | Usage |
|-------------|-------|-------|
| `--color-success` | `#4caf50` | Online, active, completed, positive |
| `--color-success-bg` | `rgba(76, 175, 80, 0.1)` | Success background tint |
| `--color-warning` | `#ff9800` | Warnings, pending states |
| `--color-warning-bg` | `rgba(255, 152, 0, 0.1)` | Warning background tint |
| `--color-error` | `#ff4444` | Errors, destructive actions, danger |
| `--color-error-bg` | `rgba(255, 68, 68, 0.1)` | Error background tint |
| `--color-info` | `#646cff` | Informational, links in admin |
| `--color-info-bg` | `rgba(100, 108, 255, 0.1)` | Info background tint |

### 2.6 Character Class Colors

| CSS Variable | Value | Class | Theme |
|-------------|-------|-------|-------|
| `--color-class-engineer` | `#c41e3a` | Engineer | Crimson — Eternal Engine, power, defense |
| `--color-class-conduit` | `#7b5ea7` | Conduit | Arcane purple — cosmic energy, reality bending |
| `--color-class-drifter` | `#00d4ff` | Drifter | Cyan — memory-walking, speed, constructed realities |
| `--color-class-vessel` | `#d4af37` | Vessel | Gold — channeling entities, cosmic OS manipulation |

### 2.7 Stat Colors

| CSS Variable | Value | Stat |
|-------------|-------|------|
| `--color-stat-str` | `#cc3333` | Strength — red |
| `--color-stat-agi` | `#33cc33` | Agility — green |
| `--color-stat-int` | `#3366ff` | Intelligence — blue |

---

## 3. Typography

### 3.1 Font Stacks

| CSS Variable | Value | Usage |
|-------------|-------|-------|
| `--font-display` | `'Garamond', 'Times New Roman', serif` | Hero titles, section headers, branding, narrative text |
| `--font-body` | `system-ui, Avenir, Helvetica, Arial, sans-serif` | Body text, forms, UI elements |
| `--font-mono` | `'Courier New', monospace` | UIDs, IPs, debug info, code |

### 3.2 Type Scale

| Token | Size | Usage |
|-------|------|-------|
| `--font-size-hero` | `3.2rem` | Hero titles (Splash page) |
| `--font-size-h1` | `2rem` | Page titles |
| `--font-size-h2` | `1.6rem` | Section titles |
| `--font-size-h3` | `1.2rem` | Card headers, subsection titles |
| `--font-size-body` | `1rem` | Default body text |
| `--font-size-small` | `0.85rem` | Secondary content, labels |
| `--font-size-tiny` | `0.75rem` | Badges, timestamps, fine print |

### 3.3 Font Weights

| Token | Value |
|-------|-------|
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-bold` | `700` |

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

| Token | Value |
|-------|-------|
| `--space-xs` | `0.25rem` |
| `--space-sm` | `0.5rem` |
| `--space-md` | `1rem` |
| `--space-lg` | `1.5rem` |
| `--space-xl` | `2rem` |
| `--space-2xl` | `3rem` |

### 4.2 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Buttons, inputs, small elements |
| `--radius-md` | `6px` | Cards, panels |
| `--radius-lg` | `8px` | Modals, large cards |
| `--radius-xl` | `12px` | Hero elements, featured cards |

---

## 5. Shadows & Effects

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.3)` | Subtle elevation |
| `--shadow-md` | `0 4px 20px rgba(0,0,0,0.5)` | Cards, panels |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.8)` | Modals, overlays |
| `--shadow-glow-primary` | `0 0 20px rgba(196,30,58,0.3)` | Crimson glow effect |
| `--shadow-glow-secondary` | `0 0 20px rgba(0,212,255,0.3)` | Cyan glow effect |
| `--shadow-glow-accent` | `0 0 20px rgba(212,175,55,0.3)` | Gold glow effect |
| `--shadow-inset` | `inset 0 1px 3px rgba(0,0,0,0.5)` | Input fields, progress bars |

---

## 6. Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | `0.15s ease` | Micro-interactions (hover color) |
| `--transition-normal` | `0.3s ease` | Standard transitions (borders, shadows) |
| `--transition-slow` | `0.5s ease-out` | Larger animations (bars, transforms) |

---

## 7. Animation Keyframes

Standard animations defined globally:

- `particle-rise` — Floating particles on splash page (upward drift with fade)
- `title-glow` — Pulsing glow effect on hero title text
- `cta-shimmer` — Shimmer sweep across CTA buttons
- `pulse` — Subtle scale pulse for active/loading indicators

---

## 8. Component Patterns

### 8.1 Buttons

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| **Primary** | `var(--color-primary)` | `var(--color-text-inverse)` | none | Main CTA actions |
| **Secondary** | transparent | `var(--color-secondary)` | `1px solid var(--color-secondary)` | Secondary actions |
| **Ghost** | transparent | `var(--color-text-secondary)` | `1px solid var(--color-border-medium)` | Tertiary actions |
| **Danger** | `var(--color-error)` | white | none | Destructive actions |

### 8.2 Cards

```css
.card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
}
.card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow-primary);
}
```

### 8.3 Form Inputs

```css
.form-input {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-medium);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: var(--space-sm) var(--space-md);
  transition: border-color var(--transition-fast);
}
.form-input:focus {
  border-color: var(--color-secondary);
  outline: none;
}
```

### 8.4 Status Badges

```css
.badge-success { background: var(--color-success-bg); color: var(--color-success); border: 1px solid var(--color-success); }
.badge-warning { background: var(--color-warning-bg); color: var(--color-warning); border: 1px solid var(--color-warning); }
.badge-error { background: var(--color-error-bg); color: var(--color-error); border: 1px solid var(--color-error); }
```

---

## 9. Responsive Breakpoints

| Token | Value | Target |
|-------|-------|--------|
| Mobile | `max-width: 600px` | Phones |
| Tablet | `max-width: 768px` | Tablets, small laptops |
| Desktop | `min-width: 769px` | Standard desktop |
| Wide | `min-width: 1280px` | Wide monitors |

---

## 10. Admin Panel Variations

The admin panel shares the same design token system but with these overrides:
- Admin uses `--color-info` (`#646cff` indigo) as its primary accent instead of `--color-primary` (crimson)
- This intentionally distinguishes the admin experience from the player-facing frontend
- All structural tokens (backgrounds, text, spacing, shadows) are shared

---

## 11. Usage Guidelines

1. **Always use CSS variables** — never hardcode hex colors in CSS or inline styles
2. **Primary (crimson)** for story/narrative/horror elements and main CTAs
3. **Secondary (cyan)** for tech/interface/data elements and links
4. **Accent (gold)** sparingly for premium/achievement/special content
5. **Backgrounds** should layer: deep → surface → elevated for visual depth
6. **Text** should use primary for main content, secondary for supporting, muted for metadata
7. **Glow effects** should match the element's semantic color (crimson glow for story, cyan for tech)
