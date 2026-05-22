---
version: beta
name: Naikit Sticker
description: Design system foundation for the Naikit Sticker redesign — a sticker / vinyl / print worksheet ops tool built on Angular 17 + Ionic + Tailwind 3. Visual language is **neo-brutalist**: brand-yellow #FFD400 + ink #0A0A0A, thick 2-3px solid ink borders, hard offset shadows (no blur), IBM Plex Sans Thai + JetBrains Mono.
font:
  sans: IBM Plex Sans Thai (self-hosted, 400/500/600/700 + CDN 800/900)
  mono: JetBrains Mono (self-hosted 500 + CDN 700/800)
colors:
  brand: "#FFD400"
  brand-2: "#E0B900"
  brand-ink: "#0A0A0A"
  brand-bg: "#FFFEF0"
  brand-bg-2: "#FFFBE5"
  bg: "#FAFAFA"
  panel: "#FFFFFF"
  panel-2: "#F4F4F4"
  panel-3: "#EFEFEF"
  ink: "#0A0A0A"
  ink-2: "#525252"
  ink-3: "#737373"
  ink-4: "#A3A3A3"
  line: "#E5E5E5"
  line-2: "#D4D4D4"
  accent: "#16A34A"
  accent-bg: "#DCFCE7"
  warn: "#CA8A04"
  warn-bg: "#FFF7CC"
  danger: "#DC2626"
  danger-bg: "#FFE9E9"
  info: "#0284C7"
  info-bg: "#E0F2FE"
shadows:
  brutal-sm: "2px 2px 0 #0A0A0A"   # default card/button
  brutal:    "3px 3px 0 #0A0A0A"   # primary surfaces, primary CTA
  brutal-lg: "4px 4px 0 #0A0A0A"   # login/hero form inputs
  brutal-xl: "5px 5px 0 #0A0A0A"   # primary login button
  brutal-brand: "3px 3px 0 #FFD400" # inverse (dark surface on yellow shadow)
rounded:
  sm: 6px
  default/md: 8px       # dominant — buttons, inputs, cards, segment controls
  lg: 10px              # larger cards / kanban columns
  xl: 12px
  "2xl": 16px           # occasional, e.g. brand logo tile
  full: 9999px          # pills, avatars
border-width:
  default: 1px
  brutal-2: 2px         # cards, buttons, inputs (default ink border)
  brutal-2.5: 2.5px     # login form inputs (heavier)
  brutal-3: 3px         # topbar bottom border, sidebar right border
---

# Naikit Sticker — Design System (beta)

## Overview

Naikit Sticker is an internal worksheet / sticker production tool used by three audiences on a single codebase: **seller** (logs orders), **graphic** (designs), and **production** (prints + ships). The brand language is unmistakably **neo-brutalist**: bold brand-yellow #FFD400 on near-black ink #0A0A0A, **every interactive surface gets a thick 2-3px solid ink border and a hard offset drop-shadow**, every numeric value renders in JetBrains Mono, and headings push 800-900 weight at tight tracking. Yellow is loud. Black is decisive. There is no gradient and no soft shadow on a primary surface.

This document is the **beta foundation** — design tokens, global styles, and 6 shared component scaffolds are in place and have been reconciled against the real extracted prototype. No existing pages have been migrated yet; see the migration roadmap at the bottom.

## Source of truth

The real prototype lives at `redesign/extracted/`:

- `prototype.html` (15 KB) — HTML shell + IBM Plex Sans Thai @font-face block.
- `assets/71f8a03f-…js` — **Shared building blocks** (StatusPill, UrgentBadge, BoldButton, TopBar, NavItem, Sidebar, ImgPlaceholder).
- `assets/f9c5012a-…js` — Nav context + responsive layout (`AppLayout`, `ProtoSidebar`, `MobileBottomNav`, `ProtoTopBar`).
- `assets/61146c5b-…js` — Login (desktop split + mobile stack).
- `assets/100cc77b-…js` — Home (desktop kanban + mobile list).
- `assets/534698ed-…js` — Create-worksheet stepper (4 steps).
- `assets/541b5f48-…js` — Worksheet info / Report / Diary screens.
- `assets/5e6a9d2a-…js` — Settings (users/groups/jobtypes/site).
- `assets/f956a0ed-…js` — Mock data (8 worksheets across 8 statuses).

The previous round of work (alpha) had to guess most tokens because the bundle was self-extracting. This beta round replaces those guesses with values read directly from the JS source.

## Updated from extracted prototype

Eleven token-level corrections vs the previous (alpha) round:

| # | Token / decision | Previously (guess)              | Actually (prototype)                                       |
|---|------------------|---------------------------------|------------------------------------------------------------|
| 1 | Sans font        | Noto Sans Thai                  | **IBM Plex Sans Thai** (self-hosted, 400/500/600/700)      |
| 2 | Card shadow      | Soft, blurred (`cardshadow`)    | **Hard offset** 2-3px (`shadow-brutal`)                    |
| 3 | Card border      | `1px solid var(--line)`         | **`2px solid var(--ink)`** — black, not grey               |
| 4 | Card radius      | `rounded-2xl` (20px) dominant   | **8-10px** (`rounded` default)                             |
| 5 | Primary button   | Soft brand-glow + 1px implicit  | Thick ink border + `3px 3px 0 #0A0A0A` brutal shadow       |
| 6 | Heading weight   | 600                             | **800** for h1-h3, **900** for display                     |
| 7 | Heading sizes    | 30 / 26 / 20 / 15               | **44** (display) / **22** (h1) / **18** (h2) / **15** (h3) |
| 8 | Semantic palette | krungthon-air greens/reds       | Tailwind palette derivatives (red-600 / green-600 / etc.)  |
| 9 | Ink-2/3 greys    | 3A3A3A / 6B6B6B                 | **#525252 / #737373** (slate-600/500 family)               |
|10 | Status colors    | None (was a TBD)                | **8 dedicated status tones** added to tokens               |
|11 | Top bar          | Was a `<app-page-header>` block | **Yellow chrome with 3px ink bottom border** (full-bleed)  |

## Colors

Two-pole brand: **#FFD400 on #0A0A0A**. Quiet neutral scale + 4 semantics + 8 worksheet-status tones.

| Token             | Hex       | Role                                                                  |
|-------------------|-----------|-----------------------------------------------------------------------|
| `--brand`         | `#FFD400` | Primary CTA fill, TopBar background, active state highlight           |
| `--brand-2`       | `#E0B900` | Brand hover state                                                     |
| `--brand-ink`     | `#0A0A0A` | Text on brand-yellow (never white on yellow)                          |
| `--brand-bg`      | `#FFFEF0` | Brand-tinted card footer / nested yellow surface                      |
| `--brand-bg-2`    | `#FFFBE5` | Lighter brand wash (rarely used)                                      |
| `--bg`            | `#FAFAFA` | Page canvas                                                           |
| `--panel`         | `#FFFFFF` | Card / panel surface                                                  |
| `--panel-2`       | `#F4F4F4` | Nested surface (kbd, placeholder background)                          |
| `--ink`           | `#0A0A0A` | Primary text, all interactive borders                                 |
| `--ink-2`         | `#525252` | Mid-grey body text (row meta, captions)                               |
| `--ink-3`         | `#737373` | Tertiary text (labels, breadcrumb, eyebrow)                           |
| `--ink-4`         | `#A3A3A3` | Placeholder / disabled                                                |
| `--line`          | `#E5E5E5` | Default 1px row divider                                               |
| `--line-2`        | `#D4D4D4` | Dashed dividers, scrollbar thumb                                      |
| `--accent`        | `#16A34A` | Success text + dot (green-600)                                        |
| `--accent-bg`     | `#DCFCE7` | Success tint (green-100)                                              |
| `--warn`          | `#CA8A04` | Warning text + dot (yellow-600)                                       |
| `--warn-bg`       | `#FFF7CC` | Warning tint                                                          |
| `--danger`        | `#DC2626` | Danger text, danger button fill, required asterisk (red-600)          |
| `--danger-bg`     | `#FFE9E9` | Danger tint                                                           |
| `--info`          | `#0284C7` | Info text + dot (sky-600)                                             |
| `--info-bg`       | `#E0F2FE` | Info tint                                                             |

**Worksheet status palette** (8 tones — `--*-fg / --*-bg / --*-dot`):

| Status (TH)       | tone key             | bg        | fg        | dot       |
|-------------------|----------------------|-----------|-----------|-----------|
| รอออกแบบ          | `status-design`      | `#FFE9E9` | `#B91C1C` | `#DC2626` |
| กำลังออกแบบ        | `status-designing`   | `#E0F2FE` | `#075985` | `#0284C7` |
| รอคอนเฟิร์มแบบ      | `status-await`       | `#FFF7CC` | `#854D0E` | `#CA8A04` |
| คอนเฟิร์มแล้ว       | `status-confirmed`   | `#DCFCE7` | `#166534` | `#16A34A` |
| รอผลิต            | `status-printq`      | `#EDE9FE` | `#5B21B6` | `#7C3AED` |
| กำลังผลิต         | `status-printing`    | `#E0E7FF` | `#3730A3` | `#4F46E5` |
| รอส่งมอบ           | `status-deliverq`    | `#FFEDD5` | `#9A3412` | `#EA580C` |
| ส่งมอบแล้ว         | `status-delivered`   | `#CCFBF1` | `#115E59` | `#0D9488` |

Use via `<app-badge tone="status-printing">กำลังผลิต</app-badge>`. Tailwind aliases (`bg-status-printing`, etc.) also exist for ad-hoc table-cell coloring.

**Rule**: never hardcode hex values in component templates. If a needed color is missing, add it to both `global.scss` and `tailwind.config.js`.

## Typography

Two families:

- **IBM Plex Sans Thai** — all UI and narrative text. Self-hosted weights 400/500/600/700 from extracted prototype woff2 files under `src/assets/fonts/ibm-plex-sans-thai/`. Weights 800/900 (used by the display headline on the login screen) are loaded async from Google Fonts CDN as a fallback.
- **JetBrains Mono** — all numeric data: prices (`฿3,300`), quantities, serial numbers (`NK-2604-018`), dates (`2026-04-27`), KPI numerals. Self-hosted weight 500; CDN fallback for 700/800.

| Token         | Size | Weight | Line-height | Letter-spacing | Usage                                                  |
|---------------|------|--------|-------------|----------------|--------------------------------------------------------|
| `display`     | 44px | 900    | 1.0         | -0.025em       | Login hero ("จบเรื่อง / กระดาษ / ในร้าน")                |
| `h1`          | 22px | 800    | 1.15        | -0.02em        | TopBar title (desktop); 18px on mobile                 |
| `h2`          | 18px | 800    | 1.2         |                | Panel header, section heading                          |
| `h3`          | 15px | 800    | 1.3         |                | Card heading, step label                                |
| `body-lg`     | 14px | 400-700| 1.55        |                | Default body, table cell                                |
| `body`        | 13px | 400-700| 1.55        |                | Dense lists                                             |
| `body-sm`     | 12px | 400-700| 1.5         |                | Caption, helper, status labels                          |
| `label`       | 11px | 700    | 1.3         | 0.1em          | Form label, breadcrumb eyebrow                          |
| `micro`       | 10px | 800    | 1.2         | 0.12em         | Sidebar section header (WORKFLOW / SYSTEM)              |

Use Tailwind tokens (`text-h1`, `text-body`, `text-label`, `text-micro`) rather than hardcoded sizes. The `.label-mono` global utility applies JetBrains Mono + uppercase + tracking in one shot for form-label eyebrows. The `.font-num` utility opts a node into JetBrains Mono with tabular-numerals — apply it to every cell rendering a price, qty, or date.

## Spacing & Shape

Tailwind's 4px base step is preserved. Card padding default is `p-5` (20px) on desktop, `p-4` (16px) on mobile. Card-to-card vertical rhythm is `gap-4` (16px) inside grids and `gap-6` (24px) between page sections.

| Radius   | Token            | Usage                                                                              |
|----------|------------------|------------------------------------------------------------------------------------|
| 6px      | `rounded-sm`     | Tight chips, inner badges (e.g. v2.0 tag, → arrow inside login button)             |
| 8px      | `rounded` / `rounded-md` | **Dominant** — buttons, inputs, cards, segment controls, kanban cards      |
| 10px     | `rounded-lg`     | Larger cards (kanban columns, login form panel, urgency strip)                     |
| 12px     | `rounded-xl`     | Occasional — large modals                                                          |
| 16px     | `rounded-2xl`    | Rare — only the brand logo tile (52×52)                                            |
| 9999px   | `rounded-full`   | Pills, badges, avatars, filter chips, FAB                                          |

**Border widths** (the brand signature):

| Width  | Class              | Usage                                                                                |
|--------|--------------------|--------------------------------------------------------------------------------------|
| 1px    | `border`           | Subtle table row divider                                                             |
| 1.5px  | `border-[1.5px]`   | Avatar ring, kbd                                                                     |
| 2px    | `border-2`         | **Default brutal border** — cards, buttons, inputs, sidebar, segment controls        |
| 2.5px  | `border-2.5`       | Login form inputs (heavier)                                                          |
| 3px    | `border-b-[3px]` / `border-r-[3px]` | TopBar bottom edge, Sidebar right edge — the page-chrome rule       |

Avoid stacking more than two distinct radii within a single composite element.

## Elevation

**Hard offset shadows, never blurred.** Five tiers:

| Class              | Box-shadow                    | Usage                                                                  |
|--------------------|-------------------------------|------------------------------------------------------------------------|
| `shadow-brutal-sm` | `2px 2px 0 #0A0A0A`           | Default card, kanban card, ghost button                                |
| `shadow-brutal`    | `3px 3px 0 #0A0A0A`           | Primary card/panel, primary CTA, hover lift on `brutal-sm` cards       |
| `shadow-brutal-lg` | `4px 4px 0 #0A0A0A`           | Login form inputs, hover lift on primary CTA                           |
| `shadow-brutal-xl` | `5px 5px 0 #0A0A0A`           | Primary login button                                                   |
| `shadow-brutal-brand` | `3px 3px 0 #FFD400`        | Inverse — black surface lifted on brand-yellow (dark CTA, summary tile) |

The soft `cardshadow` and `shadow-pop` from the alpha round are retained for non-branded passive UI only — do not use on a primary surface.

**Hover behavior** (where appropriate): on hover, increase offset by 1px and translate the element by `(-1px,-1px)`. On active, collapse the shadow to 1px and translate `(2px,2px)`. The button utility classes already encapsulate this.

**Focus ring**: combines the brutal shadow with a 3px yellow glow:
`box-shadow: 4px 4px 0 var(--ink), 0 0 0 3px color-mix(in oklab, var(--brand) 60%, transparent)`.

## Component inventory (this round)

Lives at `src/app/shared/components/`. All standalone, `@Input()`-decorated (Angular 17.0.x — signal inputs require 17.1+).

| Component            | Selector            | Updates this round                                                                                  |
|----------------------|---------------------|-----------------------------------------------------------------------------------------------------|
| `ButtonComponent`    | `<app-button>`      | Added `dark` variant (ink-fill + brand-shadow). All variants now carry 2-3px ink border + brutal shadow with hover-lift transitions. |
| `CardComponent`      | `<app-card>`        | Replaced `subtle` boolean with `variant` enum: `brutal` (default), `brutal-sm`, `flat`, `inverse`. Border is now 2px ink, shadow is brutal not soft, radius is 8px not 20px. |
| `PageHeaderComponent`| `<app-page-header>` | Now reproduces the `ProtoTopBar` — full-bleed yellow chrome with 3px ink bottom border, breadcrumb eyebrow + title + subtitle + back button. `yellow=false` for neutral pages. |
| `FieldComponent`     | `<app-field>`       | Label weight increased to 800, label tracking widened. Caller still owns the input element. |
| `IconComponent`      | `<app-icon>`        | Unchanged — prototype uses emoji icons in the design but real production code already has 25 inline-SVG icons. |
| `BadgeComponent`     | `<app-badge>`       | Added `urgent` tone (black-on-yellow) + 8 `status-*` tones for worksheet states. Bumped font-weight to 800. |

Utility classes (in `global.scss`):

- `.btn-primary` / `.btn-dark` / `.btn-ghost` / `.btn-danger` — brutal CTAs with hover/active lift.
- `.input-base` — 2px-border 8px-radius input, used in dense forms.
- `.input-brutal` — 2.5px border + 4px brutal shadow, used in hero/login forms.
- `.focus-ring:focus-within` — brutal shadow + yellow glow.
- `.label-mono` — mono uppercase eyebrow.
- `.label-eyebrow` — same shape in IBM Plex Sans Thai (for use inside yellow surfaces).
- `.font-num` — JetBrains Mono + `font-feature-settings: 'tnum' 1`.
- `.shadow-brutal*` — the five shadow tiers above.
- `.divider` / `.divider-vert` / `.divider-dashed` — 1px line variants.
- `.badge-dot` — 6px filled circle (status pill dot).
- `.page-fade` — 280ms fadeUp entry animation.

## Components still needed

The prototype shows **at least 12 patterns** not covered by the six scaffolded components. Catalog (with prototype line references) below — do not build this round.

| Component             | One-liner                                                                                          | Prototype reference                                |
|-----------------------|----------------------------------------------------------------------------------------------------|----------------------------------------------------|
| `app-shell` / `app-layout` | Authenticated chrome: sidebar (desktop) + bottom nav (mobile), responsive switch at 768px      | `f9c5012a-…js` `AppLayout` (lines 97-113)          |
| `app-sidebar`         | 240px left rail with brand tile, sectioned nav (WORKFLOW / SYSTEM), user footer                    | `f9c5012a-…js` `ProtoSidebar` (lines 38-72)        |
| `app-bottom-nav`      | Mobile bottom-tab strip with center FAB (yellow-ringed ➕)                                          | `f9c5012a-…js` `MobileBottomNav` (lines 74-94)     |
| `app-status-pill`     | Worksheet status badge — colored dot + label, two sizes (use BadgeComponent + `status-*` for now)  | `71f8a03f-…js` `StatusPill` (lines 14-29)          |
| `app-urgent-badge`    | "⚡ ด่วน" marker (use `<app-badge tone="urgent">` for now)                                          | `71f8a03f-…js` `UrgentBadge` (lines 31-40)         |
| `app-kanban-column`   | Status-colored header + scrollable card list, max-height capped per viewport                       | `100cc77b-…js` `ProtoKanbanColumn` (lines 28-45)   |
| `app-kanban-card`     | Compact worksheet preview (serial, urgent, customer, qty, seller avatar, total)                    | `100cc77b-…js` `ProtoKanbanCard` (lines 3-26)      |
| `app-step-progress`   | Numbered stepper bar with active/done states + connecting line + linear progress bar                | `534698ed-…js` Stepper bar (lines 166-177)         |
| `app-timeline`        | Horizontal worksheet timeline (8 dots + connectors, supports overflow scroll)                      | `541b5f48-…js` `Timeline` (lines 18-37)            |
| `app-segmented`       | Pill-style segmented control (filter chips at home/diary, contact channel in create)                | `100cc77b-…js` mobile-tabs (lines 101-105), `534698ed-…js` contact buttons (lines 56-60) |
| `app-stat-card`       | Tile with label + (mono) number + optional delta indicator + icon                                  | `100cc77b-…js` stats row (lines 127-146)           |
| `app-data-table`      | Sticky black header (yellow text), zebra rows, hover-yellow-tint, optional mobile horiz scroll     | `541b5f48-…js` Report table (lines 197-220)        |
| `app-tab-bar`         | Top tab strip with yellow-active + ink underline (used inside Info screen for sales/graphic/production) | `541b5f48-…js` Info tabs (lines 121-127)      |
| `app-side-tab-nav`    | Vertical nav-list on settings (yellow-active rows with ink border)                                 | `5e6a9d2a-…js` settings left nav (lines 98-108)    |
| `app-empty-state`     | Big emoji + label + helper text + (optional) CTA                                                   | `5e6a9d2a-…js` `PlaceholderContent` (lines 73-79)  |
| `app-file-drop`       | Dashed border + emoji + helper + "เลือกไฟล์" CTA                                                    | `534698ed-…js` Step4 (lines 130-136)               |
| `app-comment-thread`  | Avatar + name + timestamp + body, with dashed dividers between entries                              | `541b5f48-…js` Info comments (lines 140-151)       |

## Do's and Don'ts

- **Do** use brand-yellow (`--brand`) for exactly one primary action per screen, OR for the TopBar chrome (which is itself the primary visual anchor — the inner CTA then uses the `dark` variant).
- **Do** put **every interactive surface** on a 2px ink border + brutal shadow. The brand signature is consistent application of this rule.
- **Do** render every numeric value in JetBrains Mono via `.font-num`. Money, dates, serials, quantities, KPIs.
- **Do** use ink-on-yellow text. White on yellow is forbidden (fails AA).
- **Do** prefer composing with `<app-card>` / `<app-field>` / `<app-page-header>` over re-rolling layouts.
- **Don't** use soft drop shadows on a primary surface. Use `shadow-brutal*` or no shadow.
- **Don't** introduce a third type family. IBM Plex Sans Thai + JetBrains Mono is the system.
- **Don't** use solid `--danger` / `--accent` / `--warn` fills with white text — use the `*-bg` tint + matching `*-fg` text pattern (already encoded in `<app-badge>`).
- **Don't** stack three or more radii in a single composite element.
- **Don't** wire shared components into existing pages in this round — that's the migration roadmap below.

## Ambiguities / decisions noted

1. **Display weights 800/900** — the bundle ships IBM Plex Sans Thai 400-700 only. The login hero ("จบเรื่อง / กระดาษ / ในร้าน") renders at fontWeight 900 and 900-tracking. Decision: load 800/900 async from Google Fonts CDN so production has the full weight stack while keeping the self-hosted critical path small (400-700 cover everything except the login hero). If the login redesign uses the 900 weight in above-the-fold content frequently, self-host 800/900 too.
2. **Heading sizes diverge from a typographic ratio** — the prototype uses 44/22/18/15 rather than a clean modular scale (e.g. 1.25× or golden). Decision: keep prototype's exact sizes; a "logical" scale would diverge from the design. The 44px display is hero-only.
3. **Status palette colors derived from Tailwind defaults, not the brand-yellow family** — they're vivid because they need to be readable on small kanban cards. Confirmed verbatim from `STATUS_COLORS`.
4. **Mobile breakpoint = 768px** — prototype's `useIsMobile()` hard-codes this. Matches Tailwind's `md:`. No need to customize.
5. **Sidebar width = 240px, FAB diameter = 48px, status pill dot = 6px** — fixed pixel values in the prototype; recorded here for the component round.
6. **JetBrains Mono on body text** — only the prototype's avatar tile `NK` (16-22px) and the `v2` version badge use mono for non-numeric content. Treat as exception, not pattern.

## Migration roadmap

The prototype redesigns **6 screens** (login, home, create, info, report, diary, setting) plus the layout/sidebar/topbar chrome. The existing app has **12 pages** (`src/app/pages/`). The mapping is **not 1:1** — the prototype consolidates several existing pages and omits others. Decisions:

| # | Existing page                                          | Maps to prototype screen          | Plan                                                                                          |
|---|--------------------------------------------------------|-----------------------------------|-----------------------------------------------------------------------------------------------|
| 1 | `components/layouts/main-layout` + header              | `AppLayout` + `ProtoSidebar` + `ProtoTopBar` + `MobileBottomNav` | **Build first.** Drives every other page. Add `app-shell`/`app-sidebar`/`app-bottom-nav` components. |
| 2 | `login`                                                | `ProtoLoginScreen`                | Full redesign. Brand-yellow brand panel (desktop split) + form panel with brutal-shadowed inputs. |
| 3 | `home` (+ graphic/production/seller tabs)              | `ProtoHomeScreen`                 | Full redesign. Desktop kanban (8 status columns) + mobile list. Tabs collapse into team filter chips. |
| 4 | `create-work-sheet` (+ `work-item-modal`)              | `ProtoCreateScreen`               | Full redesign. 4-step wizard with urgency strip + step dots + linear progress. Replaces the existing single-form approach. |
| 5 | `edit-work-sheet`                                      | `ProtoCreateScreen` (same)        | Reuse the create stepper in edit mode (pre-filled). Removes the separate edit page entirely.       |
| 6 | `worksheet-info` (+ `horizontal-step-progress-bar`)    | `ProtoInfoScreen`                 | Full redesign. Replace bespoke step progress with `app-timeline`. Three-panel grid (sales/graphic/production) + comment thread. |
| 7 | `report`                                               | `ProtoReportScreen`               | Full redesign. Status breakdown grid + filterable data table. The `ngx-echarts` dependency may become unused — verify before removing. |
| 8 | `diary-summary`                                        | `ProtoDiaryScreen`                | Full redesign. Inverse "summary" hero card + data table.                                       |
| 9 | `setting` (+ `group`/`user`/`site`/`job`)              | `ProtoSettingScreen`              | Full redesign. Left side-tab nav (desktop) / horizontal tabs (mobile). Inline add-user row. The 4 sub-pages collapse into tabs. |
|10 | `drag-and-drop-file` (+ `progress`)                    | Create-screen Step 4              | The DnD page becomes a step in `create`. Keep file-handling logic; replace chrome with `app-file-drop`. |
|11 | `graphic` (standalone page)                            | **No prototype mapping**          | Keep existing page logic; apply visual restyle only (cards, buttons). Treat as a non-prototype carry-over. |
|12 | `show-image` / `show-qr-code`                          | **No prototype mapping**          | Viewer chrome only — keep canvas/QR rendering, restyle container.                              |

**Priority order** (revised based on actual prototype scope):

1. **Layout chrome** (`app-shell`, `app-sidebar`, `app-bottom-nav`, `app-page-header` is already done) — drives all pages.
2. **Login** — bypasses the layout, easy parallel work.
3. **Home / dashboard** — highest traffic, biggest visual impact.
4. **Create + Edit worksheet** — replaces the 4-page edit/create flow with a single stepper. Largest behavior change.
5. **Worksheet Info** — depends on `app-timeline` + comment-thread components.
6. **Report / Diary / Setting** — share table + filter components; can be batched after `app-data-table` lands.
7. **Graphic / show-image / show-qr-code** — passive carry-overs; restyle once design system is stable.

**Components to add in subsequent rounds** (see "Components still needed" above for full list with prototype refs).

**Open dependency decisions**:

- **Iconography** — the prototype uses **emoji** (📋 ➕ 📊 ✅ ⚙️ 🎨 💼 📦 🔍 ⚡ etc.) for navigation, status, and decoration. The existing 25 inline-SVG icons remain valid for actions inside the production code (edit / delete / etc.) but consider whether emoji or a unified inline-SVG set carries the brand better. If migrating to inline-SVG only, evaluate `lucide-angular`.
- **Dark mode** — not in scope. Brand is intentionally light-only (yellow on near-black is the only color story).
- **`ngx-echarts`** — the prototype's report screen is a **status breakdown grid + table**, no charts. Charts may be removed entirely or migrated to a brutal-styled stat-card grid. Confirm at report-page migration time.

**Recommended first migration**: the layout chrome (`main-layout` + sidebar + topbar + mobile bottom-nav). It's the wrapper every other page renders inside — landing it once flips the visual identity across all 12 pages without page-level logic edits.
