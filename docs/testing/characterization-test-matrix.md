# Smart SRRT — Characterization Test Matrix

Baseline: `main@799418cad8d570f5ec0adcb37a641977b25f9650`

## Purpose

Characterization tests capture what the current application does before refactoring. They are not all statements of desired future behavior. Tests for known bugs must first document the baseline and then be replaced or supplemented by explicit TO-BE regression tests when the corresponding gap is implemented.

## Priority

- **P0-Critical**: must exist before P1 mutation/refactor
- **P1**: required before related Group A/B implementation
- **P2**: useful hardening coverage

## Matrix

| ID | Priority | Area | Baseline behavior to characterize |
|---|---|---|---|
| CT-001 | P0-Critical | Schema | Installer creates all 8 expected sheets |
| CT-002 | P0-Critical | Schema | MainData header order is exactly 30 current columns |
| CT-003 | P0-Critical | Installer | Re-running installer preserves existing populated sheets |
| CT-004 | P0-Critical | Installer | Installer records CONFIG.VERSION as INSTALL_VERSION |
| CT-005 | P0-Critical | Auth | Self-register creates Staff/pending user |
| CT-006 | P0-Critical | Auth | Duplicate email registration is rejected |
| CT-007 | P0-Critical | Auth | Non-active users cannot log in |
| CT-008 | P0-Critical | Auth | Correct active credentials create a session token |
| CT-009 | P0-Critical | RBAC | Staff cannot create/edit/delete/report |
| CT-010 | P0-Critical | RBAC | Admin can create/edit/report but cannot delete/manage users |
| CT-011 | P0-Critical | RBAC | Manager and Super Admin currently receive identical permission sets |
| CT-012 | P0-Critical | Maintenance | closed status blocks create/edit/delete/report |
| CT-013 | P0-Critical | Event CRUD | addRecord appends a new physical row |
| CT-014 | P0-Critical | Event CRUD | updateRecord targets the supplied rowNumber |
| CT-015 | P0-Critical | Event CRUD | deleteRecord physically deletes the supplied row |
| CT-016 | P0-Critical | Event mapping | getDashboardData exposes rowNumber plus col1..col30 |
| CT-017 | P0-Critical | Public boundary | getDashboardData works without authentication |
| CT-018 | P0-Critical | Public boundary | getAppBoot exposes only the public settings allowlist |
| CT-019 | P0-Critical | KPI | baseline criteria logic treats strings containing "เข้าเกณฑ์" as matching |
| CT-020 | P0-Critical | KPI | baseline investigated count is based on non-empty investigation date |
| CT-021 | P0-Critical | Report | generateReportFromWeb addresses Event by physical row |
| CT-022 | P0-Critical | Report | missing Template/Report Folder rejects report generation |
| CT-023 | P0-Critical | RPC | all browser gs('...') targets exist server-side |
| CT-024 | P0-Critical | Source | duplicate forceGeminiModelAuto declaration is detected |
| CT-025 | P1 | Event integrity | two simultaneous append/update scenarios are reproducible in a mock repository |
| CT-026 | P1 | Event identity | migration can backfill IDs without changing legacy event values |
| CT-027 | P1 | Event deletion | future non-destructive disposition preserves event history |
| CT-028 | P1 | Public boundary | future anonymous Dashboard contract contains no raw event narrative/user fields |
| CT-029 | P1 | KPI | future exact criteria logic distinguishes เข้าเกณฑ์ from ไม่เข้าเกณฑ์ |
| CT-030 | P1 | KPI | future investigation rate numerator is a subset of eligible criteria events |
| CT-031 | P1 | Workflow | future lifecycle derives/updates predictable state without blocking emergency override |
| CT-032 | P1 | Ownership | future owner references an existing active user or is empty |
| CT-033 | P1 | Close/Reopen | closure metadata is recorded and controlled |
| CT-034 | P1 | Reports | future generated report creates a report registry record linked to EventID |
| CT-035 | P1 | Reports | future report readiness emits warnings without mandatory hard block |
| CT-036 | P1 | Attachments | future attachment metadata links Drive file to EventID |
| CT-037 | P1 | Audit | audit archival retains required evidence under the defined policy |
| CT-038 | P1 | MasterData | limited admin changes preserve canonical key/value constraints |
| CT-039 | P1 | VisitLogs | stored fields match their documented semantics |
| CT-040 | P2 | Export | server export retains current MainData column order |
| CT-041 | P2 | Areas | import rejects empty batch and batches above server limit |
| CT-042 | P2 | Areas | import upserts by current area natural key |
| CT-043 | P2 | Content | public content returns published items only |
| CT-044 | P2 | Settings | blocked infrastructure settings cannot be changed by web save path |
| CT-045 | P2 | Gemini | AUTO model resolution/fallback behavior is isolated from Event repository tests |

## Known-bug characterization rule

For known defects such as G-23, do not write a misleading green test that declares the buggy result desirable forever.

Use two layers:

1. **Baseline characterization**: proves what `main@799418c` does.
2. **TO-BE regression**: introduced with the fix and asserts the corrected rule.

Example:

- Baseline: `"ไม่เข้าเกณฑ์".includes("เข้าเกณฑ์") === true` is captured as the reason the current KPI is wrong.
- TO-BE: exact canonical criteria equality must count only `เข้าเกณฑ์`.

## Test architecture recommendation

Use a local JavaScript test runner with pure-domain modules and Google Apps Script service adapters mocked at boundaries.

Avoid making every test depend on live Spreadsheet/Drive/Gemini services.

Suggested layers:

- pure business-rule unit tests
- repository/service tests with fake Sheet/Drive adapters
- contract tests for RPC payloads
- small manual/live Apps Script smoke suite for installation/deployment

P0 does not change runtime behavior to make tests pass. Test harness implementation can be introduced incrementally, beginning with CT-019/020/023 and schema/RBAC contracts.
