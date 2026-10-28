---
name: José Planeja
description: A private-banking "Elite card" for everyday family money — statement weight, hairline rules, a single electric-blue spine.
colors:
  electric-blue: "#2626EE"
  electric-blue-pure: "#0000F3"
  periwinkle-soft: "#6A6AFF"
  paper: "#EDEEF9"
  surface-white: "#FFFFFF"
  surface-raised: "#F5F6FE"
  fill: "#ECEDFB"
  fill-subtle: "#F3F4FD"
  track: "#DADBF3"
  border: "#D5D7EF"
  border-strong: "#B8BBE6"
  ink-navy: "#0B0B33"
  muted-indigo: "#5C5F96"
  subtle-navy: "#2B2E6E"
  on-primary: "#FFFFFF"
  ring: "#4F4FFF"
  money-green: "#0E8F5E"
  expense-red: "#D62246"
  warning-amber: "#B5730A"
  navy-rail: "#080830"
  # Cartão-herói da Visão Geral — objeto azul CONSTANTE (igual nos dois temas),
  # como o cartão de crédito da referência. Gradiente + tinta periwinkle clara.
  hero-card-top: "#2A2AC0"
  hero-card-mid: "#15158A"
  hero-card-deep: "#0B0B46"
  hero-ink: "#C9C9FF"
  # Chips de status sobre o cartão escuro — cores claras fixas (não temáticas).
  status-superavit: "#9DF2CF"
  status-equilibrado: "#FFD79A"
  status-deficit: "#FFB3C1"
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
    fontSize: "15px"
    fontWeight: 800
    letterSpacing: "-0.3px"
  statement:
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-1.5px"
    fontFeature: "'tnum' 1"
  title:
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    letterSpacing: "-0.4px"
  body:
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  xs: "3px"
  sm: "5px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "18px"
components:
  button-primary:
    backgroundColor: "{colors.electric-blue}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "11px 18px"
    typography: "{typography.body}"
  button-ghost:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.subtle-navy}"
    rounded: "{rounded.sm}"
    padding: "11px 18px"
  button-primary-sm:
    backgroundColor: "{colors.electric-blue}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "7px 13px"
  input:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.md}"
    padding: "10px 13px"
  card:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.xl}"
    padding: "18px"
  nav-item:
    textColor: "{colors.subtle-navy}"
    rounded: "{rounded.md}"
    padding: "12px"
  icon-btn:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.subtle-navy}"
    rounded: "{rounded.md}"
    size: "40px"
---

# Design System: José Planeja

## Overview

**Creative North Star: "The Elite Card Statement"**

José Planeja renders household money with the calm authority of a premium metal card and a private-bank statement — never a playful budgeting toy. The world is monochromatic electric-blue (a single hue ~240°): a live primary that runs from pure `#0000F3` through the working `#2626EE`/`#4F4FFF` and up into periwinkle tints. Every surface carries real depth (offset + soft blur shadows) and a 1px top highlight that reads like the milled edge of a metal card — the signature move of the system. Corners are crisp and tight; nothing is a pill.

Two themes stand as equals, switched by `[data-theme]` with a `prefers-color-scheme` mirror for unset users. Light is a cool, periwinkle-tinted near-white paper with deep navy ink; dark is a set of deep-navy "card" grounds with periwinkle ink. The product is mobile-first (a Brazilian pt-BR / BRL PWA for families checking money monthly), so density, touch targets, and a left slide-in drawer hub drive the shell.

The world explicitly refuses the category default (soft, rounded, pastel budget apps with pill buttons and gamified confetti) and the AI-generic look (cream + serif, or near-black + one neon glow). The one idea it owns: money rendered with the weight of a statement — crisp tabular figures, hairline rules, and a single electric-blue spine that marks where you are and what matters.

**Key Characteristics:**
- Monochromatic electric-blue, one hue ~240°, from pure blue through periwinkle.
- The 1px metal-card-edge top highlight on every raised surface.
- Crisp, tight corners (3–16px); never a pill except on data-bar tracks and status dots.
- Tabular numerals on every money figure.
- Two first-class themes: periwinkle paper / navy ink, and navy ground / periwinkle ink.
- A left drawer hub as the navigation model, with an electric-blue active spine.

## Colors

A single-hue electric-blue field carries the whole product; semantic money colors sit on top of the blue only where they carry meaning. All values below are the light (base) theme; the dark theme retokenizes the same roles (see Named Rules and the sidecar's `colorMeta`).

### Primary
- **Electric Blue** (`#2626EE`, dark `#4F4FFF`): the live primary — primary button fill, links, focus, the active drawer spine, selection and caret. The working voice of the system.
- **Electric Blue Pure** (`#0000F3`, dark `#6A6AFF` as `--primary-strong`): pure emphasis; the top stop of the primary button's vertical gradient and the logo tile.
- **Periwinkle Soft** (`#6A6AFF`, dark `#ADADFF` as `--accent-soft`): scrollbar thumbs, soft accent washes.

### Neutral
- **Paper** (`#EDEEF9`, dark `#050522` as `--bg`): the app ground; a faint periwinkle tint separates cards from the field.
- **Surface White** (`#FFFFFF`, dark `#0C0C38`): raised card and panel surfaces.
- **Surface Raised** (`#F5F6FE`, dark `#090930`): secondary surfaces and select fields.
- **Fill** (`#ECEDFB`, dark translucent periwinkle): input backgrounds. **Fill Subtle** (`#F3F4FD`) for hover washes.
- **Track** (`#DADBF3`): data-bar rails.
- **Border** (`#D5D7EF`, dark translucent periwinkle) and **Border Strong** (`#B8BBE6`): hairline divisions and hover emphasis.
- **Ink Navy** (`#0B0B33`, dark `#EAEAFF`): primary text. **Muted Indigo** (`#5C5F96`, dark `#9A9BDA`): secondary text and labels. **Subtle Navy** (`#2B2E6E`, dark `#C8C9F5`): emphasized body text and control labels.

### Semantic (money)
- **Money Green** (`#0E8F5E`, dark `#2BD08C` as `--success`): income / receita.
- **Expense Red** (`#D62246`, dark `#FF6B86` as `--danger`): expense, debt, negative projection.
- **Warning Amber** (`#B5730A`, dark `#FBBF24` as `--warning`): spend meter, caution.
- Data-viz category colors (moradia, alimentação, transporte, …) are a deliberate multi-hue set used only inside category breakdowns, always with transparency.

### Named Rules
**The One Spine Rule.** Pure electric-blue emphasis marks one thing per view — the primary action and the active nav row. Its rarity is what makes the statement figure and the active spine read.

**The Semantic-Only Color Rule.** Green, amber, and red appear *only* where they carry financial meaning (income, caution, expense/debt). They never decorate. Everything else is the blue field or a neutral.

**The Dual-Theme Parity Rule.** Light and dark are equals, not a primary plus an afterthought. Never hardcode a hex for a themed role; reference the CSS custom property (via `C.*` or `var(--*)`) so both themes and the system-preference mirror stay correct.

## Typography

**Display Font:** Plus Jakarta Sans (fallback Inter, sans-serif) — weights 500–800.
**Body / UI Font:** Inter (fallback Segoe UI, system-ui, sans-serif) — weights 400–800.

**Character:** Plus Jakarta Sans gives the brand lockup a confident, slightly geometric banking presence; Inter carries all UI and figures with quiet precision. Both are loaded from Google Fonts. Tabular numerals are on globally (`font-variant-numeric: tabular-nums`, `"tnum" 1`) so money columns align like a statement.

### Hierarchy
- **Display** (Plus Jakarta Sans, 800, ~15–28px, letter-spacing −0.3px): the "José **Planeja**" wordmark and auth lockup only.
- **Statement** (Inter, 800, 26–34px, line-height 1.04, letter-spacing −1.5px, tabular): the dominant month-projection figure and KPI/plan-price values. The hero of every money surface.
- **Title** (Inter, 800, 14–22px, letter-spacing −0.4px): panel heads, section titles, admin page H1.
- **Body** (Inter, 400–700, 12–13.5px, line-height 1.5): rows, descriptions, table cells.
- **Label** (Inter, 700–800, 10–11px, letter-spacing 0.06–0.14em, UPPERCASE): field labels, section eyebrows, nav-group headers, table column heads.

### Named Rules
**The Tabular Money Rule.** Any figure that represents money uses tabular numerals and tight negative tracking (down to −1.5px at statement size). Money is a column, not prose.

## Layout

Mobile-first, single-column by default; grids collapse at phone widths. The user shell is a slim top bar (min-height 58px) over scrolling content, with a left drawer as the navigation hub. The drawer is `min(86vw, 344px)` wide, slides in over a blurred scrim, and groups modules under uppercase labels (Visão / Dia a dia / Crédito & dívidas / Planejamento / Inteligência / Operação).

Breakpoints: 480px and 560px in the app shell (phone → tablet re-ordering of brand / actions / month stepper), 640px for the legacy tab-strip, 840px for the admin console. Responsive grids used throughout: `stat-grid` (auto-fit minmax 140px), `form-grid-2` / `income-grid` (2-up collapsing to 1-up at 480px), KPI grids (4-up → 2-up). A horizontal-scroll safety net (`overflow-x: clip`, `max-width: 100%`) guarantees no horizontal scroll on phones. Spacing rhythm clusters at 6 / 8 / 10 / 12 / 14 / 18px; card padding is 18px, compact cards 13–14px.

## Elevation & Depth

Depth is real and always present — this world is never flat. Surfaces combine an offset+blur drop shadow with the metal-card edge highlight, and the primary action adds a colored blue glow. Dark theme deepens the shadows to near-black so navy cards lift off the navy ground.

### Shadow Vocabulary
- **Edge** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.92)`; dark `inset 0 1px 0 rgba(173,173,255,0.18)`): the signature 1px top highlight — the milled edge of a metal card. Paired with a drop shadow on every raised surface.
- **Shadow-sm** (`0 1px 2px / 0 2px 6px` navy-tinted): resting cards, icon buttons, the month stepper.
- **Shadow** (`0 2px 6px / 0 16px 40px` navy-tinted): the drawer and featured/floating panels.
- **Shadow-primary** (`0 6px 18px rgba(38,38,238,0.28)`): the electric-blue glow under the primary button and active nav icon tile.

### Named Rules
**The Metal-Edge Rule.** Every raised surface (card, panel, drawer, KPI, logo tile, button) carries the `--edge` top highlight together with its drop shadow. The pairing is the brand; a surface with a shadow but no edge, or an edge but no depth, is off-world.

## Shapes

Crisp, tight corners on a five-step radius scale: `--r-xs` 3px, `--r-sm` 5px (buttons), `--r-md` 8px (inputs, chips, icon buttons, nav items), `--r-lg` 12px (panels, KPIs, plan cards), `--r-xl` 16px (large content cards). The only full-round (999px) elements are data-bar tracks/fills and the small status dots/count pills — functional pills, never buttons. Divisions are 1px hairlines in the border color; the active nav spine is a 3px bar flush to the drawer's left edge.

## Components

### Buttons
- **Shape:** crisp 5px corners (`--r-sm`); never pills.
- **Primary:** vertical electric-blue gradient (`linear-gradient(180deg, --primary-strong, --primary)`), white text, 11px 18px padding, 13px/700 with −0.01em tracking, carrying `--shadow-primary` plus an inset top highlight. Hover brightens (`filter: brightness(1.06)`); active nudges down 1px.
- **Ghost:** surface background, hairline border, subtle-navy text, `--shadow-sm`; hover fills subtle and strengthens the border.
- **Danger / Success:** 12%-tint fill of the semantic color on surface, 28%-tint border, semantic text — quiet, meaning-bearing variants.
- **Small:** 7px 13px padding, 12px text.

### Inputs / Fields
- **Style:** fill background, 1px hairline border, 8px corners (`--r-md`), 10px 13px padding, 13px text.
- **Focus:** the field glows — `box-shadow: 0 0 0 3px` of a ~18% primary tint, border shifts to primary (see `.money-field:focus-within` and global input focus). Keyboard focus elsewhere uses a double ring: 2px of background then 4px of `--ring`.
- **Money input:** a cash-register field that fills from the right (centavos first), rendering pt-BR `1.234,56` while emitting a clean number.

### Cards / Containers
- **Corner Style:** 16px (`--r-xl`) for content cards; 12px (`--r-lg`) for panels/KPIs.
- **Background:** surface-white (dark: navy surface).
- **Shadow Strategy:** `--shadow-sm, --edge` at rest (see Elevation).
- **Border:** 1px hairline in border color.
- **Internal Padding:** 18px standard; 13–14px compact.

### Navigation
- **Model:** a left slide-in drawer hub (the private-bank menu), opened by the ≡ menu button in the top bar.
- **Rows:** icon tile + bold label + muted description, grouped under uppercase group labels. 8px corners, subtle-navy text.
- **Active:** `aria-current="true"` gets a ~9% primary-tint background, a 26%-tint border, a 3px electric-blue spine flush to the left edge, and an inverted icon tile (primary fill, white glyph, blue glow). Hover fills subtle.

### Icons
- **Lucide**, single stroke weight (`strokeWidth` 2; 2.2 inside badges). Sizes 12–26px. Icons are line glyphs, never filled illustrations.

### Signature: Statement Hero
The Visão Geral opens with a statement card: a label eyebrow, then the dominant month-projection figure (34px/800, −1.5px tracking, tabular; red when negative), a status badge (superávit / equilibrado / déficit), and a renda-vs-gasto meter with percent-of-income and projected daily spend. It is always rendered, even at zero, so the first fold always reads as a statement.

### Signature: Admin Console (variant)
The `/admin` operator console lives in the same electric-blue world but retokenizes for dense management via `.admin-root` local variables: a dark navy rail (`--a-rail` `#080830`, dark `#04041A`) with a periwinkle brand mark and an active-row left spine, a two-column shell (248px rail + fluid main), KPI cards, min-620px tables with uppercase column heads, status pills (round) and chips (3px). It keeps the metal edge, the `--r-sm` buttons, and the shadow vocabulary. Below 840px the rail is replaced by a horizontal scrolling nav strip (`.ad-mnav`).

## Do's and Don'ts

### Do:
- **Do** pair `--edge` with a drop shadow on every raised surface — the metal-card edge is the signature.
- **Do** render every money figure with tabular numerals and tight negative tracking; keep money in columns.
- **Do** reference themed roles through `C.*` / `var(--*)` so both themes and the system-preference mirror stay correct.
- **Do** keep pure electric-blue emphasis rare — one primary action and one active nav row per view (The One Spine Rule).
- **Do** use crisp corners from the 3–16px scale; reserve 999px for bar tracks and status dots only.

### Don't:
- **Don't** ship pill-shaped or flat/shadowless buttons — corners are 5px and depth is real.
- **Don't** use green/amber/red decoratively; they carry financial meaning only.
- **Don't** hardcode a hex for a themed role, or build a light-only surface — the two themes are equals.
- **Don't** introduce serif or cream/pastel "budget-app" or near-black + neon "AI-generic" treatments; this world is monochromatic electric-blue.
- **Don't** canonize the legacy `.tab-strip` as a navigation pattern; the drawer hub is the model (see note below).

<!--
NOT CANONIZED (defects/drift the build carries, recorded but not made into rules):
- Legacy `.tab-strip` (index.css) is retained "para quem ainda referenciar" — pre-existing drift from the drawer model; left in place, not repaired this pass.
- The admin console's mobile nav (<840px) uses a horizontal `.ad-mnav` tab-strip rather than the drawer model the user app uses — a documented divergence, not the house navigation rule.
FOLLOW-UP (inherited, not yet done):
- Per-tab internal screens beyond Visão Geral inherit the token world but were not individually restyled this pass.
DIVERGENCE FROM DIRECTION CONTRACT (build wins):
- Contract named button radius ~4px and panels ~8–10px; the build shipped --r-sm 5px buttons and --r-lg 12px panels. Recorded as shipped.
-->
</content>
</invoke>
