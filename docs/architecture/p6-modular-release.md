# P6 — Modular Source & One-Click Release Architecture

Scope: G-30

## Decision

Smart SRRT keeps Google Apps Script as its production runtime.

P6 changes the **engineering source layout**, not the runtime platform.

```text
src/server/* + src/web/*
          ↓
 deterministic assembler
          ↓
Code_Smart_SRRT_OneClick_v2026.09.08.1.gs
Index_Smart_SRRT_OneClick.html
          ↓
 Google Apps Script
```

## Source of truth

Feature/refactor work must be made in `src/`.

The two root One-Click files are generated release artifacts.

CI runs exact-byte parity checks. A commit fails when modular source and the generated artifacts differ.

## Server modules

| Module | Responsibility |
|---|---|
| `00-config.gs` | CONFIG, schema/header constants |
| `01-bootstrap-installer.gs` | doGet/menu, installer, migrations, assets, seed/format |
| `02-core-auth.gs` | DB/settings helpers, password/session/RBAC |
| `03-event-dashboard.gs` | boot/master/public aggregates, Event lifecycle and CRUD |
| `04-admin-governance.gs` | users, area, settings, content, audit, attachments, VisitLogs |
| `05-export-report.gs` | export, report readiness/registry/generation |
| `06-gemini.gs` | Gemini model resolution, API calls, report prompt/drafting |

The split is deliberately coarse. P6 does not create a class/service hierarchy for its own sake.

## Web modules

The current single-page UI is split into contiguous source sections:

- head
- styles
- body
- application script
- tail

P6 deliberately does not introduce React/Vue/Svelte or a client build framework.

## Deterministic build

`npm run build`

concatenates the ordered source modules and writes the current One-Click artifacts.

`npm run build:check`

performs the same assembly in memory and fails if the committed artifacts are not byte-identical.

No timestamp, random value or environment-specific value is inserted into build output.

## Contract verification

`npm run check:contracts` verifies:

- server syntax
- inline browser script syntax
- unique server function declarations
- every browser RPC target has a matching server function
- browser has no physical Event rowNumber dependency
- browser does not reintroduce substring criteria KPI logic
- Event delete path remains non-destructive

## Full verification

`npm run verify`

runs:

1. build parity
2. source/runtime contracts
3. all P1–P5 automated tests

This is the minimum CI gate for modernization branches.

## Duplicate cleanup

The legacy source contained two `forceGeminiModelAuto()` declarations.

P6 removes the earlier shadowed declaration and retains the later implementation that was already the effective runtime behavior.

Therefore this cleanup removes ambiguity without changing runtime behavior.

## One-Click compatibility

District operators still receive the two familiar files and are not required to install:

- Node.js
- Git
- clasp
- a bundler
- an external database

Node is development/CI tooling only.

## AppVersion

P6 does not pretend the modernization stack has been released merely because code exists in Draft PRs.

`CONFIG.VERSION` remains unchanged until the release/merge gate approves an actual new AppVersion.

The old source-header date/version drift is tracked for the release pass; the final release artifact header and `CONFIG.VERSION` must agree before tagging.
