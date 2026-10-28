---
version: 1
slug: "src-components-dashboard-jsx"
primary_target: "src/components/Dashboard.jsx"
related_targets: ["src/index.css","src/components/tabs/AdminTab.jsx"]
---

## Scope

Surface: the **José Planeja** user app shell and its screens (mobile-first PWA), plus the **/admin** operator console as a related surface. Visitor mode: **Operate** — the visitor comes to read their month's money and act on it. Code-led build (Operate).

Audience: Brazilian individuals/families checking household finances on a phone, monthly cadence. Job: know the current balance and projected end-of-month result, and record/adjust money fast. Constraints: pt-BR, BRL, light **and** dark themes both first-class, all existing financial logic and data flows preserved.

## Direction contract

THESIS: A private-banking "Elite card" for everyday family money — the calm authority of a premium metal card and a bank statement, not a playful budgeting toy. It refuses the category default (a soft, rounded, pastel budget app with pill buttons and gamified confetti) and the AI-generic look (cream + serif, or near-black + one neon glow). One idea it owns: **money rendered with the weight of a statement** — crisp tabular figures, hairline rules, a single electric-blue spine that marks where you are and what matters.

OWN-WORLD: Monochromatic electric-blue world (single hue ~240°): `#0000F3`/`#4F4FFF` as the live primary, periwinkle tints `#8080FF`/`#ADADFF`/`#D9D9FF`, deep navy grounds `#000095`/`#00004E`. Light theme = cool near-white (periwinkle-tinted) paper with navy ink; dark theme = deep navy "card" grounds with periwinkle ink. Surfaces carry a **1px top highlight** like the milled edge of a metal card (the signature move). Depth is real (offset + soft blur shadows, never flat), corners are **crisp and tight** (buttons ~4px, panels ~8–10px, never pills). Type: Plus Jakarta Sans for display/wordmark, Inter for UI, tabular numerals everywhere money appears. Icons: lucide, one stroke weight. Semantic colors (money-green success, amber, red) sit on top of the blue only where they carry meaning.

STORY: The visitor opens the app, immediately reads this month's balance and status (superávit / equilibrado / déficit) in large statement figures, understands at a glance whether they're on track, and reaches any module from a left **drawer** (the hub) that reads like a private-bank menu. They record a transaction or adjust income without hunting.

FIRST VIEWPORT (mobile): Slim top bar — menu (≡) at left, wordmark, month stepper, bell/profile/theme at right, all on a navy-edged surface. Below it the Visão Geral: the balance/projection as the dominant figure with its status, then the income-vs-spend meter, then category breakdown. Primary action (novo lançamento) is reachable and unmistakable. The drawer slides from the left over a scrim: large icon+label+description rows grouped (Dia a dia / Crédito & dívidas / Planejamento / Conta), with the active row carrying the electric-blue spine.

FORM: Operate shell with a left drawer as the navigation model; the world contributes type, palette, density, and the metal-card-edge signature only. Position on ordered list: brief-pinned (user specified premium Elite fintech / e-wallet, monochromatic blue, hub+drawer, no rounded-flat buttons). seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
