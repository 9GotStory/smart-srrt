# GS-S1 — Server RPC Boundary and Operator Maintenance Hardening

**Current verified status (2026-10-12):** **MERGED** to `main` by PR [#95](https://github.com/9GotStory/smart-srrt/pull/95) at `378506e19d418739e13cfb12e171bb722300a439`; [Post-Merge CI](https://github.com/9GotStory/smart-srrt/actions/runs/38200914386) PASS. **NOT DEPLOYED** to Apps Script; [release readiness](../release/gs-security-release-readiness-2026-10-12.md) remains HOLD. Historical merge/candidate gates later in this document describe its original pre-merge authoring stage, not current GitHub state.  
**Base:** `main@b8e2c1043730f2ce9e9eed49e704ec7436cd23c9`, following [GS Architecture Review](../architecture/gs-architecture-review-2026-10-12.md).  
**Scope:** seven canonical Apps Script server modules, same 24-file Native staged package, no schema or data migration.

## Why this change is necessary

Google HTML Service `google.script.run` can invoke *any top-level, non-private server function*, even if the page has no visible button. Functions ending in `_` are private to that browser client. `Session.getActiveUser().getEmail()` may be blank in a Web App executing as the developer; `Session.getEffectiveUser().getEmail()` is the identity under whose authority the code runs. Neither a hidden button nor effective identity **alone** is an authorization control.

Official references: <https://developers.google.com/apps-script/guides/html/communication>, <https://developers.google.com/apps-script/reference/base/session>, <https://developers.google.com/apps-script/guides/web>.

## Exact server-side design

A single private `requireTrustedOperator_(operation)` function in `src/server/00-bootstrap.gs` checks **all** of:

1. Exactly one explicitly provisioned `GS_TRUSTED_OPERATOR_EMAIL` in `PropertiesService.getScriptProperties()`; it must be a syntactically plausible single email. No default, browser-supplied email, anonymous fallback, or inferred ownership.
2. The actual `Session.getActiveUser().getEmail()` is available and equals that configured email.
3. The actual `Session.getEffectiveUser().getEmail()` equals the same configured email.

Comparison trims whitespace and is case insensitive; a blank, absent, mismatched or unsupported identity **fails closed before any privileged mutation or lock acquisition**. Error responses do not expose the configured identity. A matching effective user *alone* never grants access. The guard cannot be called from `google.script.run` because its name ends in `_`.

The 15 still-public functions below remain named the same so existing **Spreadsheet menu / owner maintenance** entrypoints keep their API names, but are **privilege-gated at function entry**:

| File | Privileged public functions now gated |
|---|---|
| `00-bootstrap.gs` | `installSmartSRRT`, `setupDatabase`, `resetSuperAdminPassword`, `showDatabaseInfo` |
| `01-schema-and-db.gs` | `migrateG05EventOwner`, `migrateG11EventAttachments`, `migrateG21AuditRetention`, `migrateG29VisitLogs`, `migrateG17ReportRegistry`, `migrateP1EventIdentity` |
| `05-reports-and-models.gs` | `clearGeminiModelCache`, `listAvailableGeminiModels`, `testGeminiConnection` |
| `06-gemini-and-prompts.gs` | `forceGeminiModelAuto`, `forceGeminiModelStable` |

The `include(filename)` function remains public **because `Index.html` uses it for server-side HTML template expansion**. It now validates the argument against the exact 16 approved Native HTML partial names, rejecting `Index`, server files, path traversal, unrecognized names and non-string values before calling `HtmlService`.

`onOpen`, `doGet`, login, registration, public Dashboard, and authenticated business RPC names and behavior are unchanged. `repairInstallation(sessionToken)` already demands `requireAuth_(sessionToken,'settings')` and is not part of the new operator-only gate. No front-end code is changed. This is not an authorization rewrite for regular login/session flows.

### Required manual operator precondition for a *future, separately approved deployment*

A Google Apps Script project editor with proper authority must manually set **Project Settings → Script Properties → `GS_TRUSTED_OPERATOR_EMAIL`** to one explicitly approved Google account. This should be the authorized account executing Spreadsheet maintenance **and** the effective runtime identity for those tasks. *No email value or credential is committed to the repository.*

**Important behavior change:** maintenance/migrations/account reset and Gemini model diagnostics will fail until that Script Property is configured and both Google session identity checks succeed. This is intentional; do not weaken the gate or derive authorization from `getEffectiveUser()` alone to preserve a workflow. If Google identity is blank (including some execute-as-developer Web Apps), the call must remain denied; use a separately authorized editor context, not a browser escape hatch. Existing `onOpen` may still display the menu, but operations will fail closed unless authorized.

Before any production rollout, the Product Owner/operator must perform **read-only** verification of the existing Web App version/access policy/`executeAs` and confirm the trusted operator runbook on a **non-production** project. Do **not** call `resetSuperAdminPassword`, `installSmartSRRT`, migrations, or Gemini functions on the live deployment to test an authorization hypothesis.

## Security regression gate

`tests/gs-s1-operator-rpc-boundary.test.mjs` is wired into both `npm run check:contracts` and the full `npm test` suite. Its offline V8/Node VM characterizations:

- freeze the 69 existing public top-level function names, requiring explicit review of future RPC surface expansion;
- verify a private trusted-operator guard appears first in every one of the 15 privileged wrappers;
- deny unconfigured, invalid, blank-active, mismatched-active, mismatched-effective, blank-effective or multi-address settings **before any LockService work**;
- positively allow only the matching operator identity and stop at an intentionally stubbed first mutation boundary, without real writes;
- ensure `include` supports all 16 manifest partials but refuses untrusted filename/path/payload variants;
- preserve existing public App Boot, Guest Dashboard and authorized Report Job API signatures.

Keep the broader baseline: 7 server GS + 16 HTML partials + 1 generated Index = **24 Native files**. Source-order and stage byte parity are mandatory. No One-Click changes, no migration, no installer, no clasp or live Workspace/Gemini/API calls.

## Open limitations and following gates

- Source-only tests do not confirm the current `/exec` deployment identity, access setting or user-specific Google authorization behavior. Production impact stays **unverified**.
- This protects **operator maintenance functions**; it does **not** address GS-S2 user password leakage into AuditLogs, GS-S3 password hashing/registration strength or GS-S4 server-side regeneration consent. Those require separately scoped PRs and validation.
- An internal privileged function ending in `_` still must enforce or inherit appropriate server-side controls when called by another public RPC. The review freezes current public entrypoint names, not a proof against every future call-graph bypass.
- The guard introduces an explicit operator prerequisite that must be treated as a rollout gate; absence is not a reason to grant broader access.

**CI target:** exact HEAD PASS on Native build/parity, `check:contracts`, all regression tests, P6 `codeGate=PASS` and intentional `releaseDecision=HOLD`. ChatGPT Technical Review is **author-assisted, not independent**. Product Owner approval required separately for Merge and any Apps Script Deployment.
