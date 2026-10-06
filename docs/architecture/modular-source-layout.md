# Smart SRRT — Modular Source Layout Design

## Objective

Improve maintainability (G-30) without changing the runtime platform or forcing district users to operate a complex deployment stack.

Principle:

> **Modular source; simple deployment.**

Google Apps Script remains the runtime for the current modernization scope.

## Proposed repository layout

```text
smart-srrt/
├─ src/
│  ├─ server/
│  │  ├─ Config.gs
│  │  ├─ Schema.gs
│  │  ├─ AuthService.gs
│  │  ├─ PermissionService.gs
│  │  ├─ EventRepository.gs
│  │  ├─ EventService.gs
│  │  ├─ DashboardService.gs
│  │  ├─ AreaService.gs
│  │  ├─ UserService.gs
│  │  ├─ ContentService.gs
│  │  ├─ SettingsService.gs
│  │  ├─ ReportService.gs
│  │  ├─ GeminiService.gs
│  │  ├─ AttachmentService.gs
│  │  ├─ AuditService.gs
│  │  ├─ Installer.gs
│  │  └─ Migrations.gs
│  │
│  └─ web/
│     ├─ Index.html
│     ├─ Styles.html
│     ├─ AppScript.html
│     ├─ Api.html
│     ├─ Dashboard.html
│     ├─ Records.html
│     ├─ Reporter.html
│     └─ Admin.html
│
├─ tests/
│  ├─ characterization/
│  ├─ unit/
│  ├─ contract/
│  └─ fixtures/
│
├─ docs/
│  ├─ baseline/
│  ├─ architecture/
│  ├─ deployment/
│  ├─ governance/
│  ├─ roadmap/
│  └─ testing/
│
├─ legacy/
│  └─ v2026.09.08.1/   # optional after migration; do not move baseline until separately approved
├─ appsscript.json
├─ .clasp.json.example
├─ package.json
├─ README.md
└─ CHANGELOG.md
```

## Server responsibility boundaries

### Config / Schema
Own constants, sheet names, canonical headers, versions and schema definitions.

### Auth / Permission
Own credential/session behavior and RBAC checks. No Event or Drive business logic.

### EventRepository
Own physical MainData access only. It must hide row-number implementation details from higher layers.

### EventService
Own Event business rules: identity, lifecycle, owner, close/reopen and consistency warnings.

### DashboardService
Own public aggregate and authenticated analytics contracts. It must not directly expose raw storage rows.

### ReportService
Own Event-to-report orchestration and report registry. Gemini API mechanics remain in GeminiService.

### AttachmentService
Own Event-to-Drive attachment metadata; do not become a general Drive file manager.

### Installer / Migrations
Installer creates a fresh compatible system. Migrations upgrade an existing system idempotently.

## Browser responsibility boundaries

### Api.html
Single wrapper for `google.script.run`. Page code must not scatter direct RPC construction.

### Dashboard.html
Rendering/filter interaction only; no canonical KPI rules in the browser after G-23.

### Records.html
Event form/UI only.

### Reporter.html
Readiness display and report actions only.

### Admin.html
Settings/users/areas/master/audit administration.

## Runtime compatibility

Apps Script supports multiple `.gs` files in a project; runtime does not require one monolithic Code.gs.

HTML partials can continue to be composed using the existing `include(filename)` helper.

The deployed application must still have an `Index.html` template available because `doGet()` currently evaluates `Index`.

## Refactor order

Do not split every file in one uncontrolled commit.

Recommended sequence:

1. introduce tests/docs while legacy source remains untouched;
2. extract pure constants/schema;
3. extract permission/business helpers;
4. place storage operations behind repositories;
5. separate public Dashboard service;
6. separate report/Gemini responsibilities;
7. split web partials;
8. remove legacy monolith only after parity gate.

## Compatibility rule

During modularization, public RPC names remain stable unless an intentional Group A/B contract change is being introduced with migration and regression coverage.

## What G-30 does not mean

G-30 does **not** authorize:

- changing from Apps Script to Node/backend hosting,
- replacing Google Sheets with another database,
- replacing Drive/Docs,
- adding a frontend framework,
- adding a generic workflow engine.

Those are separate architecture decisions and are outside the approved Group A/B scope.
