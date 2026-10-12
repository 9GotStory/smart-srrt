# GS-S2 — Credential / Audit Redaction

**Current verified status (2026-10-12):** **MERGED** to `main` by PR [#96](https://github.com/9GotStory/smart-srrt/pull/96) at `22ee59e10d1dc79b72c0846413d6793cb2eb8f10`; [Post-Merge CI](https://github.com/9GotStory/smart-srrt/actions/runs/38201820037) PASS. **NOT DEPLOYED** to Apps Script; [release readiness](../release/gs-security-release-readiness-2026-10-12.md) remains HOLD. Historical merge/candidate gates later in this document describe its original pre-merge authoring stage, not current GitHub state.  
**Baseline:** `main@378506e19d418739e13cfb12e171bb722300a439` (GS-S1 Post-Merge CI PASS).  
**Scope:** prevent newly supplied user passwords and prior password digests being persisted in **new** AuditLogs rows. Does not perform retroactive data cleanup.

## Previously confirmed credential-leak source path

- `src/server/03-events-and-dashboard.gs` `updateUser(sessionToken,userId,patch)` previously formed `before=JSON.stringify(values[i])`: entire `UserAccounts` row, including column 4 `PasswordHash`.
- The same function passed `JSON.stringify(patch)` to `writeAudit_`; `patch.newPassword` can contain the **raw user-entered replacement password**.
- `src/server/04-admin-and-audit.gs` `writeAudit_` persists the passed Before/After values in `AuditLogs` (and logs may later be archived).
- Normal password hash storage/validation is **not changed** in GS-S2. Hash modernization is separately planned GS-S3.

## Code changes

1. `updateUser` now emits **allowlisted safe audit metadata only**:
   - `before`: previous `role` and `status`.
   - `after`: only names of allowlisted updated public profile fields, new `role` and `status`, and boolean `passwordChanged`.
   - **Never** serializes the complete UserAccounts row, PasswordHash or arbitrary `patch` into audit. This keeps existing application mutation, role/status update, PasswordHash write and audit action/target IDs unchanged.
2. `writeAudit_` now sanitizes structured JSON payloads before `appendRow`:
   - Recursively masks credential-labeled fields such as `password`, `passwordHash`, `newPassword`, `token`, `sessionToken`, `apiKey`, `private_key`, `authorization`, `cookie` and `secret`; limits traversal depth.
   - Sanitizes clearly labeled credential assignments in free text and Bearer credentials.
   - For a legacy **UserAccounts** top-level JSON row array, masks column 4 even if an older caller passes it in error.
   - Existing non-secret audit metadata shape (10 columns, action, target, role, time, UUID, structured field values) remains intact. Audit transport still follows the existing best-effort catch policy; changing failure semantics is GS-S5.
3. New offline VM tests exercise `updateUser` and `writeAudit_` with synthetic canary passwords/hash/API keys/tokens. Tests check both the real UserAccounts mutation and the fact that AuditLogs receives **no** canary credential. Normal Event audit payload and simulated audit sink failure are also checked.
4. `npm run check:contracts` adds the new GS-S2 tests; `npm test` discovers them as usual.

## Security boundary and limitations

- This is a *defense-in-depth*, key-aware sanitizer; no content filter can detect every possible unlabeled secret in arbitrary narrative text. Callers **must not** pass entire user records, raw login requests or credential-bearing objects to the audit sink. An explicit allowlist at source is the first layer.
- GS-S2 is **not a historical log remediation**. The system may already have credential values in active AuditLogs, archived spreadsheets, exports or backups from earlier versions. Do not scan, export, manipulate, redact, delete or rotate actual credentials automatically. Plan an owner-approved, access-restricted audit exposure assessment; carefully preserve audit integrity and retention evidence while deciding rotations/retention cleanup.
- The audit may contain health-event narratives as before; separate clinical data minimization/privacy decisions from credential redaction. Do not represent this PR as full PDPA compliance.
- Neither the logged-in user's password nor any actual personal/health information was accessed while writing or testing this patch. All test secrets are synthetic.
- No authentication algorithm, schema v7, roles, EventID/Revision, G-32 Report Job consent/cancellation, private Gemini token handling, deployment, historical One-Click, or Apps Script Script Property changes are included.
- No real Apps Script API, database, Google Workspace, sensitive admin action, installer, migration or model call was executed.

## Governance / gates

**Native stage remains 24 files** (7 server GS, 16 HTML partials, generated Index); `tools/native-sources.mjs` and `tools/deploy-g34-clasp.sh` are untouched. Changes: `src/server/03-events-and-dashboard.gs`, `src/server/04-admin-and-audit.gs`, offline security tests and documentation.

CI should demonstrate exact HEAD, deterministic native-stage byte parity, UI asset check, contract tests, full regression and P6 `codeGate=PASS` with **`releaseDecision=HOLD`**. ChatGPT Technical Review is author-assisted, **not independent**; CI is not actual Apps Script Browser UAT nor evidence of sanitized historical logs.

**Merge requires separate Product Owner approval. Even after Merge, Apps Script deployment and historical audit remediation require independent approvals.** Follow-up GS-S3/GS-S4/GS-S5 remain separate workstreams.
