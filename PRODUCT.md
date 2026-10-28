# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** Brazilian individuals and families managing household money from their phones. An account holder ("principal") plus optional dependents ("membros"); language pt-BR, currency BRL. They check the app on a monthly cadence to understand whether the month ends in surplus or deficit.
- **Secondary:** platform operators/admins who run the business — managing users, subscription plans, modules, invoice-import rules, and global settings through a separate admin console.

## Product Purpose

José Planeja lets a person or family track monthly income and spending, credit-card bills, loans, installment purchases, investments, and savings goals, with an AI assistant for analysis — so they always know their current balance and projected end-of-month result. It is sold as a subscription SaaS; plans unlock feature modules.

## Positioning

What a generic budgeting app could not truthfully copy:

- **Models Brazilian financial reality, not an abstract budget.** Cash regime: a credit-card invoice weighs on the month by what was actually *paid* (reconciled), a physical card carries a revolving balance, and installment purchases are de-duplicated against imported invoices so nothing is counted twice.
- **Income is built from holerites (payslips) per member** plus per-member extra incomes — not a single manual salary field.
- **AI-assisted invoice import that is regex-first**, with Groq AI only as reinforcement, chosen for privacy (does not train on user data).
- **Family/multi-member by design:** principal + dependents, with subscription price scaling per dependent.

## Operating Context

- Used primarily on **mobile** as an installable PWA, often one-handed; the user navigates month by month.
- **Two distinct surfaces:**
  1. the end-user financial **app** (tabbed dashboard);
  2. an operator **admin console** (business KPIs, users, plans, modules, import analysis, settings).
- Invoice parsing is **bank-specific** (Nubank, Bradesco, CAIXA, Itaú); risky parsing changes are gated per bank.
- Multi-device: optimistic save with stale-data conflict detection and reload.

## Capabilities and Constraints

- **Surfaces & routing (confirmed decision):** the admin/management console is separated from the user app onto a **dedicated `/admin` route within the same SPA** (shared build, login, and deploy; isolated from the user-app shell). Today the two share one SPA toggled by a tab — this becomes a URL-addressed route. Both surfaces are in scope for the redesign, **app first**.
- **User-app modules/tabs** (gated by the user's subscription plan): Visão Geral, Receitas, Lançamentos, Extrato, Cartões de Crédito, Empréstimos, Investimentos, Metas, Histórico, Assistente IA. The app degrades to only the modules the plan allows.
- **Admin sections** (not a plan module; gated by `access.admin`): Visão Geral (negócio), Usuários, Planos, Módulos, Importações, Configurações.
- **Stack (existing, must be preserved):** Vite + React 18 SPA frontend; Express + Sequelize + PostgreSQL backend; JWT auth + Google OAuth; PWA. Theming is light/dark via CSS custom properties in `src/index.css` (tokens surfaced through `src/lib/constants.js`).
- **Billing:** Stripe integration exists but `BILLING_ENABLED` is currently false; new users default to the "Completo" plan. Revisit the default when charging is switched on.

## Brand Commitments

User-volunteered and binding for this work; recorded here as constraints only — the actual visual world (palette values, type, components) is decided in new-work, not in this file.

- **Name / wordmark:** "José Planeja".
- **Desired feel:** premium, trustworthy, "Elite" standard.
- **Fully modern layout that must NOT read as AI-generated or templated.**
- **Mobile-first;** the menu/navigation structure is to be re-thought for mobile.
- **No rounded, flat buttons** (explicit user constraint).
- **Base color palette** is sourced from a Figma file — "Color wheel palette generator (Community)": https://www.figma.com/design/MItG11e5Ai7ag642TcfXf0/Color-wheel-palette-generator--Community-?node-id=1-2 (exact values to be captured in new-work).
- **Directional layout reference** (inspiration, not to be copied): Figma "E-Wallet Mobile App Design (Community)": https://figma.com/design/fdZOOBWOWgN1koeUlhFL9y

## Evidence on Hand

- A working application in-repo: user app under `src/`, backend under `server/`. Current theme tokens live in `src/index.css`; logo in `src/components/Logo.jsx`.
- No confirmed customer testimonials, user counts, pricing figures, or third-party benchmarks exist yet — future work must not fabricate them.

## Product Principles

1. **Mobile-first and one-handed.** The monthly money picture must be legible and actionable on a phone before anything else.
2. **Brazilian financial reality is the model.** Cash regime, card invoices, installments, holerites — never a generic budgeting abstraction.
3. **Trust through precision.** Numbers must reconcile (no double counting); the experience must feel premium and reliable, not generic.
4. **Two surfaces, two pressures.** The end-user app and the operator admin console are distinct surfaces with distinct URLs and distinct design demands (consumer clarity vs. data-dense operation).
5. **Progressive access.** Subscription plans unlock modules; the app degrades gracefully to what the plan allows.

## Accessibility & Inclusion

Language is pt-BR; the app ships light and dark themes and is used on touch devices, so touch-target sizing and theme contrast both matter. No formal accessibility standard has been established yet — not to be invented.
