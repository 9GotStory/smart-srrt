# H0-B — Restricted Operator Evidence Request (NOT AUTHORIZED / NOT EXECUTED)

**Prepared:** 2026-10-12 (Asia/Bangkok)  
**Companion source review:** [H0-A Authentication Source Inventory](h0-authentication-source-inventory-2026-10-12.md)  
**Exact baseline:** `main@9bab0d5354aaeefae3d038c2c914f4717fc9adb9`  
**Current permission:** GitHub source analysis and planning only. **No authority** to connect to Google Workspace, browse real Apps Script projects, run `clasp`, inspect actual Script Properties or human identities, export files, modify Google settings or execute a benchmark.  
**Default evidence state:** `NOT_COLLECTED`; live validation `NOT_RUN`; decision `HOLD`.

## 1. Scope-specific human authorization form (template, not an approval)

| Required approval item | Placeholder to be completed privately by Product Owner |
| --- | --- |
| Owner authorizing **H0-B metadata read** | **NOT_GRANTED** |
| Explicit target: separate staging vs existing production *metadata only* | **NOT_SELECTED** |
| Named authorized Google operator/custodian | **UNASSIGNED — do not publish email** |
| Permitted services | **UNSELECTED** — Apps Script metadata / Workspace identity policy / selected file-permission metadata |
| Permitted operations | **NONE** until approved; e.g. metadata GET/LIST only with an action-level allowlist |
| Explicit forbidden scopes | No project/source write, `clasp pull` without sensitive backup authority, `clasp push`, deploy, manifest/property mutation, installer, migration, Audit archive, password reset, Gemini, patient data, direct live login probes |
| Least-privilege access identity / separation | **UNASSIGNED** |
| Allowed evidence storage (restricted, outside GitHub) | **UNASSIGNED** |
| Redaction & retention / DPO contact | **UNASSIGNED** |
| Stop conditions / expiry | **UNDEFINED** — unexpected PHI, elevated token, unsupported access context, permission mismatch or unapproved target => stop |
| Human go/no-go for *this read-only task* | **HOLD** |

A generic approval to “continue documentation” or to **Merge** a GitHub PR does **not** authorize this form's Google access. Do not paste the real identifiers, email addresses, OAuth tokens or sensitive policy settings into a PR comment.

## 2. Suggested separate approved evidence packets

The planned packets are **minimal metadata summaries**. Full underlying values are held in an authorized restricted vault, never in source control. Every field below currently remains NOT_COLLECTED.

| Packet | Evidence to verify | Current status | Never include in public GitHub |
| --- | --- | --- | --- |
| E1 — Identity coverage | Count bands for agency-managed / cross-agency / personal/external Google accounts, whether centrally enforced 2SV/MFA applies to all private users, disabled/offboarded-account process, administrative control/exception policy | **NOT_COLLECTED** | Actual staff list, email, Google subject, tenant ID/domain if sensitive, security-policy screenshots |
| E2 — Execution authority | Actual immutable published version, Script ID vs Deployment ID, Web App `webapp.access` enum (`MYSELF`/`DOMAIN`/`ANYONE`/`ANYONE_ANONYMOUS`), `webapp.executeAs` enum (`USER_ACCESSING`/`USER_DEPLOYING`), current editable HEAD distinction | **NOT_COLLECTED** | Raw Script ID, URL, tokens, unrestricted scripts/source backup |
| E3 — Manifest/OAuth | V8, real scope list approved/changed flags, consent behavior per user type, grant minimization, deployed entrypoint agreement | **NOT_COLLECTED** | Actual `appsscript.json` with private references, OAuth tokens/secrets |
| E4 — Storage permissions | Per role-class ability to read/write synthetic-equivalent Sheets, Drive attachments, Google Docs templates/generated reports, Gemini API request path, without broad file sharing | **NOT_COLLECTED** | Patient data, file IDs, template contents, keys, links or real user access lists |
| E5 — Public-private reachability | Current project has one public HTML Service source; identify independently authorized public delivery strategy, iframe policy, anonymous RPC, alternative `/exec` and direct bypass risk | **NOT_COLLECTED** | Hidden endpoints, live credential-bearing URLs, patient event identifiers |
| E6 — Operator workflows | `GS_TRUSTED_OPERATOR_EMAIL` config **presence/format/match** flags; Spreadsheet Editor vs Web App identity behavior; review `archiveAuditLogsFromSheetMenu` and GS-S1 operator boundary, without running any mutating RPC | **NOT_COLLECTED** | Configured Google email, Script Properties raw values, AuditLogs |
| E7 — Credential/Session migration | Whether user IDs and roles have stable identity-link ownership, mixed-verifier risk and v2 session cutover plan; report only permitted aggregated categories | **NOT_COLLECTED** | Password hashes, session tokens, UserAccounts raw rows |
| E8 — Data protection/recovery | R05 historic AuditLog handling and R08 small-cell suppression/privacy owner, immutable rollback record, test-only back-up/restore owner | **NOT_COLLECTED** | Old audit rows, patient records, unrestricted backups |

**Do not use G-34 `tools/deploy-g34-clasp.sh --preflight` as a stand-in for this metadata task**: it performs remote `clasp pull` and creates restricted local backups. Even that “preflight” requires action-specific data-access and backup authorization. No exact Script ID or actual `appsscript.json` was collected by H0-A.

## 3. Decision table before managed identity migration

| Question | Verification threshold | Current |
| --- | --- | --- |
| A1 `USER_ACCESSING` workable? | All authorized staff/partners can authenticate under an **enforced MFA policy** and can access the required Sheets/Drive/Docs within approved least privilege; blank user identity denies | **UNKNOWN** |
| A2 server-verified Google OIDC workable? | Signature/`aud`/`iss`/`exp`/`hd` (if used), stable `sub`, replay-safe server verification and proven Google token/service security | **NOT_IMPLEMENTED/NOT_TESTED** |
| Public/Private separation workable? | Separate minimized anonymous project/artifact or equally proven source/RPC/storage boundary; R08 public small-cell review | **NOT_DESIGNED/NOT_TESTED** |
| Legacy `login`/`registerUser` closure? | No password or v2 session bypass when MFA-only staff route is mandatory; protect registration and privileged reset paths | **NOT_IMPLEMENTED** |
| R03/R04 requirements? | Real GAS KDF metrics and approved enforceable anti-abuse/IdP control after isolated staging | **NOT_RUN / OPEN** |
| Operator & sensitive Audit archiver? | Only approved dual Google operator path or reviewed equivalent restriction; `archiveAuditLogsFromSheetMenu` individually assessed | **NOT_REVIEWED IN LIVE CONTEXT** |
| Privacy and ownership? | R05/R08 DPO/owner determination and no public PHI exposure, stable UserID/EventID/Revision/ReportRegistry | **OPEN** |
| Rollback? | Immutable dual-verifier and identity-policy-compatible artifact, restricted backed-up manifest plus synthetic restore rehearsal | **NOT_REHEARSED** |

## 4. Future evidence record format (empty)

Use this compact record for *each* authorized check in restricted storage, publishing only safe aggregate outcomes after owner review:

```text
EVIDENCE_ID: UNASSIGNED
HUMAN_APPROVAL_REFERENCE: NONE
APPROVED_ACTION_AND_TARGET_CLASS: NONE
SOURCE_SHA: NOT_SELECTED
EXECUTION_CONTEXT: NOT_RUN
EVIDENCE_TIMESTAMP_WITH_TZ: NOT_RUN
EVALUATOR_ROLE: UNASSIGNED
TEST_OR_PACKET_ID: NONE
EXPECTED: NOT_DEFINED
OBSERVED_CLASSIFICATION: NOT_COLLECTED
OUTCOME: NOT_RUN
EXCEPTIONS_OR_ANOMALIES: NONE_RECORDED
RESTRICTED_STORAGE_REFERENCE: UNASSIGNED
REVIEWER_AND_SIGNOFF: NOT_COMPLETED
```

Never change `NOT_COLLECTED` to `PASS` from a GitHub CI run, developer assumption, screenshots of unrelated projects or inferred Google policy. Do not treat a failed attempt to access sensitive data as authorization to try broader permissions.

## 5. Completion boundaries

- **H0-A (GitHub source-only)** may be marked **DOCUMENTED** after docs PR source review, exact-head CI and separately approved Merge.
- **H0-B (actual Google operator/MFA/deployment/data-ACL metadata)** is **NOT_STARTED** until a separate, scoped Product Owner approval with custodians and secure evidence storage.
- **ADR-AUTH-01 Managed Identity** remains **PROPOSED**, not accepted/implemented.
- **R01–R08** remain open, even if documentation and contract tests pass.
- **Production Apps Script** remains `APPS_SCRIPT_DEPLOYMENT=HOLD`; no `clasp`, API, Google Workspace or production access occurred under H0-A.

**Proposed next authorization after merging H0-A:** limited **H0-B E1 + E2** read-only identity-coverage and deployment-metadata classification by a named authorized custodian, excluding tokens, files, user rows and source backups. All remaining packets require explicit scope extensions; do not automatically run them.
