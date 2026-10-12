# Smart SRRT — Google Apps Script Architecture Review

**Review date:** 2026-10-12 (Asia/Bangkok)  
**Source authority:** `9GotStory/smart-srrt` at `main@ec072debd1f343ca9b1f34ac190584a75180f935`  
**Type:** source-only architecture/security review. **No tests executed anew, no server mutation, no Apps Script deployment.**  
**Reviewer:** ChatGPT (author-assisted review; not independent or a penetration test)  
**Status:** findings proposed for Product Owner triage; NOT a release authorization.

## Executive decision

The current **seven Native Google Apps Script `.gs` files are structurally sufficient**. The team does not need to arbitrarily split these into more files before proceeding. The M01-00..05 Native web modularization is also complete at source level (16 HTML partials + generated Index). The previously verified baseline GitHub Actions run [#38198925669](https://github.com/9GotStory/smart-srrt/actions/runs/38198925669) passed 379 regressions / 20 contract tests, but **that is not evidence that all trust boundaries are secure**.

**Recommendation: STOP before shipping new GS changes or moving UI/UX code into production until security remediation is separately scoped and reviewed.** Two source-confirmed high-impact risks require prompt triage: privileged server entrypoints reachable at the HTML Service RPC interface, and credentials/password-derived material being included in user-update audit payloads. The severity of live exposure remains conditional on the actual deployed version, access policy and execution identity, which were **not inspected or tested**.

## Inventory and ownership

| Server source | Approx. lines | Responsibility and notable secondary ownership |
|---|---:|---|
| `00-bootstrap.gs` | 465 | Config, schema constants, HTML Service entrypoint, installation, menu/operator recovery and asset setup |
| `01-schema-and-db.gs` | 797 | Schema/migrations, Spreadsheet access, seed data, token/role primitives, password digest |
| `02-auth-and-attachments.gs` | 799 | Login/session, RBAC-protected attachment/owner operations **plus MasterData admin** |
| `03-events-and-dashboard.gs` | 742 | Event CRUD, revision/lifecycle, public aggregate Dashboard **plus User/Area Admin and logo upload** |
| `04-admin-and-audit.gs` | 501 | System settings, audit retention/archive, exports and content admin |
| `05-reports-and-models.gs` | 844 | Report Registry, document finalization, G-32 jobs, permissions and model discovery/connection |
| `06-gemini-and-prompts.gs` | 360 | Gemini transport/retry, prompt construction **plus operator model-settings helpers** |

**Static function inventory:** 173 top-level function declarations, no duplicate top-level function names across the seven `.gs` modules. Some functions are intentionally public RPCs; internal helpers commonly end in `_`. Dependencies intentionally share the global Apps Script realm; these are not ES modules. M01's canonical Native server manifest is unchanged.

**Coupling:** `00` depends on schema and audit helpers; `01` calls bootstrap, auth and audit helpers; `02` uses DB, Events/Area and Audit; `03` uses DB, Auth, Audit; `04` uses Bootstrap, DB, Auth and Events/Area; **`05 ↔ 06` call each other** for Gemini prompts/models/checkpoints. Cyclic names are legal in GAS's shared global namespace but increase maintenance/review difficulty.

## Source-confirmed findings, ordered by priority

### F-01 — Critical/High (conditional live impact): Privileged maintenance entrypoints lack server-side authorization

**Evidence:** `src/server/00-bootstrap.gs` exposes operator/installation and account-recovery entrypoints including the Super Admin password reset, without an in-function `requireAuth_` or equivalent operator authentication; `src/server/01-schema-and-db.gs` contains public migration entrypoints; `src/server/05-reports-and-models.gs` and `06-gemini-and-prompts.gs` expose model-cache/connection/setting actions without a server-side authorization guard. The account-recovery operation returns newly generated credentials in its normal result.

**Trust boundary:** Google's documented HTML Service RPC model exposes top-level non-private functions through `google.script.run`; naming a function with a trailing underscore hides it from that client API. This applies regardless of whether the site's visible HTML has a button for it. Docs: <https://developers.google.com/apps-script/guides/html/communication>. Web-app `executeAs` and access settings affect which account's privileges are used: <https://developers.google.com/apps-script/guides/web>.

**Impact:** If those functions are present in an accessible web-app deployment with suitable script privileges, they could bypass the application's intended Manager/Super Admin menu boundaries. This source review does **not** establish that the currently deployed `/exec` version contains these exact functions or that a given caller can invoke them.

**Remediation direction:** Separate intentionally client-callable RPCs from privileged operator-only maintenance. Move sensitive implementation behind private `_` helpers and restrict any necessary top-level wrapper with explicit identity/role checks that fail closed. Preserve legitimate Spreadsheet menu workflows behind narrowly scoped owner-approved wrappers, not broad web-client entrypoints. Add negative authorization tests, including unauthenticated calls and unauthorised roles. Never rely on client-side button visibility as security. **Do not run or probe live credential-reset functions as a review test.**

### F-02 — High: User password material reaches Audit log payloads

**Evidence:** `src/server/03-events-and-dashboard.gs` `updateUser` serializes the pre-update full user row and unredacted `patch` into `writeAudit_`. That row contains a stored password digest, and `patch` can include `newPassword` when the user is changed. `src/server/04-admin-and-audit.gs` `writeAudit_` writes these values to `AuditLogs`. Thus the code path can persist a newly supplied password verbatim in the audit record.

**Remediation direction:** Redact/exclude plaintext credentials and password digests *before* any log/queue/Spreadsheet serialization. Log only safe field names, actor, target, timestamp, operation and password-changed boolean. Add tests with sentinel secrets asserting absence in all audit payloads. With appropriate owner authorization, examine existing **AuditLogs, archived audit sheets and backups** for affected history; plan restricted handling, rotation and cleanup without corrupting audit integrity. No historical data accessed or changed in this review.

### F-03 — High: Password storage, enrollment strength and authentication resilience

**Evidence:** `01-schema-and-db.gs` `hashPassword_` uses a single SHA-256 digest without per-user salt; `02-auth-and-attachments.gs` `registerUser` accepts passwords as short as four characters. The current `login` path shows a password check and issuance of six-hour CacheService tokens but no source-level rate/attempt limiting.

**Remediation direction:** Design a backward-compatible, versioned credential-hash upgrade to an appropriate salted and work-factored verifier or approved identity provider, strengthen minimum password requirements, add credential-stuffing defenses and explicit recovery/session invalidation rules. Do not invalidate existing users or silently reset passwords without a migration plan. Tests must cover legacy transition, failed attempts, disabled users, expiry, and concurrent sessions.

### F-04 — High/Medium: Server-enforced report regeneration consent needs its own contract

**Evidence:** `05-reports-and-models.gs` `createReportJob` authorizes the user and verifies EventID/exclusive job state, but does not itself check the existing Report Registry count or collect an explicit second-report consent. The UI `03i-client-report-actions.html` performs a preflight and prompts the user; `runReportJob` validates ownership and job state, and `generateReportFromWeb` requires a private execution nonce.

**Remediation direction:** Characterize whether repeated reports are allowed by policy; if consent is mandatory, enforce it at the *server-side job-creation boundary*, with a fresh registry/revision check and explicit, auditable regeneration intent. Preserve existing G-32 ownership, nonce, cancellation and unknown-state recovery protections. This is a trust-boundary finding, **not** a confirmed live bypass test.

### F-05 — Medium: Audit success is not observable by the caller

**Evidence:** `04-admin-and-audit.gs` `writeAudit_` catches and suppresses all exceptions. Some workflows have committed a business mutation before calling it. The explicit G-32 post-commit policy explains why throwing after durable Report Registry persistence can cause duplicate retries.

**Remediation direction:** Define the failure policy *per operation*: differentiate pre-commit mandatory audit from post-commit best-effort telemetry, surface monitoring/alerts for dropped entries and avoid representing a committed report as failed. Do not naively change `writeAudit_` to always throw: preserve document/registry idempotency.

### F-06 — Medium: Module responsibility drift and global bidirectional coupling

**Evidence:** MasterData administration resides in the Auth/Attachments file; user/area/asset administration resides in Events/Dashboard; Gemini discovery and prompt-processing dependencies span `05` and `06` bidirectionally.

**Remediation direction:** **Keep all seven files for now.** Add a maintained server RPC/permission matrix and dependency map, then move functions only in separately reviewed, byte-parity-backed scopes if maintenance demands it. Do not split by file length alone or add a bundler.

### F-07 — Medium: Sheets scan scalability, audit-data minimization and public aggregates

**Evidence:** `getFilteredEventRows_` and user/setting lookups scan Sheet ranges; `getReportSummariesForEvents` bounds requested Event IDs to 500 but scans the full MainData Event universe and Report Registry for requested summaries. Public Dashboard returns village/disease/risk counts and labels, not raw Event rows. Report prompting sends event-related text to an external Gemini API.

**Remediation direction:** Load-test with plausible large datasets before introducing caching or indexing. Preserve public aggregate-only boundaries and consider small-cell suppression if public-health privacy policy requires it. Document data-minimization/lawful-basis rules for event contents sent to Google services. No runtime performance benchmark, re-identification analysis or PDPA legal determination was made.

## Controls already worth preserving

- `requireAuth_` / `hasPermission_` on Event, attachments, Owner, Admin, and report operational APIs.
- EventID + `Revision`, ScriptLockService and closed/void status checks on Event mutations.
- Public Dashboard returns only aggregates via `getPublicDashboardData`; raw Event data requires the `view` permission.
- G-32 Report Job owner binding, single active job slot, private execution nonce, cancellation checkpoints, fail-closed unknown status and Report Registry source-revision.
- Versioned schema and guarded staged-byte parity; frozen One-Click outputs; P6 `releaseDecision=HOLD`.

## Proposed implementation sequence (separate owner approval for each change)

1. **GS-S1 — Server RPC Boundary & Operator Maintenance Hardening.** Explicit web vs operator entrypoint inventory, wrappers/private implementations, privilege-denial tests. First independently verify the *current live deployment's* version/access/executeAs **without invoking any sensitive mutation**.
2. **GS-S2 — Credential/Audit Redaction.** No secret-bearing audit records; verified non-secret canary tests; carefully planned handling of historical logs and archives.
3. **GS-S3 — Authentication Modernization.** Stronger credentials, salted work-factored verification or managed identity, compatibility, throttling, token lifecycle.
4. **GS-S4 — Report Registry Server Consent Gate.** Enforce duplicate/regeneration policy at server boundary, with exact ownership/idempotency/recovery tests.
5. **GS-S5 — Observability and maintainability.** Audit outcomes, RPC contract matrix, optional ownership regrouping and targeted performance checks.

**Decision gate:** Complete at least GS-S1/GS-S2 source remediation review before authorizing deployment of this Native code or extending public-facing capabilities. GS-S3/GS-S4 may require product decisions and a separately staged rollout. Existing actual production safety remains **unverified**. No in-production Google Apps Script calls, user credentials, patient records, migration, clasp push, or service configuration changes were performed in this review.

### GS-S2 Follow-up — Credential audit payloads (candidate, 2026-10-12)

The source remediation in `docs/implementation/gs-s2-credential-audit-redaction.md` addresses source-confirmed F-02: user updates must not log raw new passwords or previous PasswordHash. This is a new-write change only with synthetic VM tests and defense-in-depth structured audit payload redaction. This section does **not** close historical exposure: existing AuditLogs, archived audit spreadsheets, exports, backups and credentials have **not** been inspected or changed. Historical remediation must be an explicitly approved restricted operation. Do not deploy until GS-S2 source gates and separate rollout authority pass.

### GS-S3 Follow-up — Password and session protection (source candidate, 2026-10-12)

GS-S3 `docs/implementation/gs-s3-authentication-modernization.md` is the source-only implementation for F-03, adding versioned salted PBKDF2-HMAC-SHA256 verifier, successful legacy-login migration, stronger new password policy, best-effort per-account throttling and password-bound sessions. Non-production GAS performance and external abuse-control requirements remain release blockers. This candidate is **not deployed**; no actual user accounts or stored sessions were modified by this source review.

### GS-S4 Follow-up — report regeneration consent (source candidate, 2026-10-12)

GS-S4 `docs/implementation/gs-s4-server-report-consent.md` addresses F-04 by adding a server-issued, short-lived, one-use consent capability for an authenticated deliberate regeneration action. The G-32 job creation endpoint independently reads the Report Registry and confirms owner/Event/registry-count/latest-report/Revision freshness. This does not prove a literal human click and does not itself certify live GAS release readiness. The candidate is not deployed and has not accessed real clinical/report records or installed a migration.
