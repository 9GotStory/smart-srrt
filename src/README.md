# Modular source

This directory is the **development source of truth** for Smart SRRT.

## Server

`src/server/*.gs` is intentionally split into a small number of contiguous modules:

1. configuration/constants
2. bootstrap/installer/migrations
3. core/auth
4. Event/dashboard/lifecycle
5. admin/governance
6. export/report registry
7. Gemini/report drafting

The modules remain ordinary Google Apps Script global-scope JavaScript. P6 does not introduce a Node runtime or module loader into production.

## Web

`src/web/*` contains contiguous sections of the current single-page UI.

The split is deliberately coarse. It avoids a frontend-framework rewrite and preserves the existing runtime HTML exactly.

## One-Click artifacts

District installation still uses:

- `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs`
- `Index_Smart_SRRT_OneClick.html`

These are generated release artifacts.

Run:

`npm run build`

after changing modular source.

CI runs:

`npm run build:check`

and fails if the committed One-Click artifacts drift from `src/`.

Do not make feature changes directly in generated One-Click artifacts.
