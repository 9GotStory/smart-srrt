# ADR-AUTH-01 — Managed Identity Transition for Smart SRRT

**Status:** PROPOSED / NOT ACCEPTED / NO IMPLEMENTATION AUTHORIZATION  
**Date:** 2026-10-12 (Asia/Bangkok)  
**Source of truth inspected:** `main@6dc50e6c886adec9b2cefa8af612e9f405b0a1ff` (RR-04 PR #106 merged; 64 contract tests, 423 regression tests, Native 24-file parity, `releaseDecision=HOLD`).  
**Owner:** Smart SRRT Product Owner, **decision pending**.  
**Security review:** ChatGPT author-assisted desk review only, **not independent audit**.  
**Boundary:** Docs-only ADR + decision/evidence matrix. No new credential service or web deployment, no Google Workspace project/actor read, no Production settings, no app code/test/manifest/schema changes, no Merge authorization.  
**Release blockers:** R01–R08 remain **OPEN/HOLD**; this ADR does **not** close R03 (PBKDF2 feasibility), R04 (anti-abuse), or R05 (historical AuditLogs privacy). **Explicit deployment boundary: `APPS_SCRIPT_DEPLOYMENT=HOLD`; GitHub document Merge alone cannot change it.**

## 1. Context — what the actual source does today

Smart SRRT currently runs as a Google Apps Script HTML Service Web App backed by Google Sheets, Drive, Docs and Gemini. The deployed Apps Script Web App remains on its separately maintained prior version; **a GitHub merge is not a GAS release**.

At the exact source SHA:
- `src/server/02-auth-and-attachments.gs` exposes public `login(payload)` and `registerUser(payload)`, searches `UserAccounts`, verifies SHA-256 legacy or versioned PBKDF2-HMAC-SHA256 (12,000 work iterations for new hashes), uses a best-effort per-email ScriptCache failure counter, and mints an opaque credential-tagged session. RR-01 `AUTH_LEGACY_UPGRADE_MODE_='auto'` supports on-success migration; `pause` is a source-only emergency compatibility option, **not** a verified recovery release.
- `src/server/01-schema-and-db.gs` resolves `requireAuth_(sessionToken, action)` and roles `Super Admin`, `Manager`, `Admin`, `Staff` against current account state; `makeSessionToken_(user)` currently **requires `passwordHash`** and binds a v2 session tag to that hash. A managed-login solution **cannot** simply reuse this function with an empty/fake hash; session binding and revocation need a reviewed new protocol.
- `src/server/00-bootstrap.gs` serves the complete `Index` through `doGet`, uses `XFrameOptionsMode.ALLOWALL`, calls `logVisit_`, and exposes only allowlisted HTML partials through `include`. Its 15 privileged operator RPCs require `GS_TRUSTED_OPERATOR_EMAIL` and **both** matching, nonblank active and effective Google identities. This operator guard is distinct from the application RBAC and must **not** be replaced with an app-level admin role.
- `registerUser` distinguishes duplicate-email errors, and each new password hash requires expensive KDF work; public registration, reset, audit/support and the exposed `google.script.run` callable function surface must be re-evaluated together.
- Public Dashboard is currently aggregate-only, yet **small-cell disclosure/anonymity has NOT been certified** (R08). All raw Event, Person/Organization, Attachment, Report Registry, AI Report and user-management routes must remain authenticated and server-authorized.

The 7 GAS + 16 HTML Native partials + generated Index (24 staged files) and frozen One-Click artifacts are unchanged. A future split must have its own approved packaging, manifest, migration and deployment process.

## 2. Proposed decision (conditional recommendation, not approval)

**Preferred target: organization-managed identity with enforceable MFA for all PRIVATE users + separate independently restricted PUBLIC aggregate delivery**, retaining Smart SRRT's own UserID, Status, Role and business permissions after identity proof.

This is **a proposed target**, not an approved implementation choice. It is viable only if the Product Owner confirms organizational identity coverage (including cross-agency users), MFA/passkey administration, access and ownership of backing Sheets/Drive/Docs, the resulting GAS execution model and the public/private trust separation in a restricted non-production pilot.

### Mandatory trust-zone separation

| Zone | Audience | Permitted response | Prohibited |
| --- | --- | --- | --- |
| **P — public aggregate** | Anonymous audience **only if R08 explicitly permits** | Approved minimized, suppressed aggregate counters/charts, no protected metadata or actionable RPCs | User directory, raw event rows/IDs, small-cell identifying slices, files/reports, login/registration/privileged RPCs, direct access to private storage |
| **S — protected staff app** | Specifically provisioned, managed identity + confirmed MFA assurance where enforceable | Approved Event CRUD, Report/AI operations, attachments, user scope and server-side RBAC | Trusting UI hiding, email strings, unauthenticated requests, external actor default roles, privileged maintenance through normal app session |
| **O — operator-only** | Named editor/service custodians in an explicitly approved Google context | GS-S1-approved maintenance after dual-identity guard, controlled backups/migrations | Public RPC invocation, App Super Admin role as substitute for Google operator identity |
| **D — data/services** | Restricted owners and approved service principals | Sheets/Drive/Docs/Gemini with least privilege, private auditing and recovery | Broad Drive/Sheet sharing solely to make `USER_ACCESSING` execute successfully; token disclosure in browser or logs |

**Key design constraint:** two Web App deployments of a *single* GAS project do **not** by themselves prove public/private isolation. A publicly accessible deployment may expose the same top-level RPCs through `google.script.run` even if private buttons are hidden. Prefer a dedicated minimal PUBLIC project/artifact with no private RPC/source/credentials, plus a restricted STAFF project/backend with its own access control. Such a split is only an architectural candidate; it requires explicit separate approval and a safe means of publishing privacy-reviewed aggregate data without exposing sensitive storage. Do not infer that separate routes, HTML tabs, deployment IDs or a proxy in front of a public `/exec` prove isolation.

## 3. Platform realities and viable patterns

| Pattern | Identity security implications | Operational blocker / verdict |
| --- | --- | --- |
| **A1 — Private GAS Web App `USER_ACCESSING` + restricted access** | Google executes as the accessing user; in an authorized context Google identity may be available. Must verify the *actual* caller identity and fail closed when blank; explicitly map to enabled Smart SRRT UserID and role. Managed MFA requires an administrator-enforced policy and evidence, not merely a Google login page. | User-consented OAuth scopes and **user's individual data access** now govern Sheets, Drive, Docs and report generation; blanket file sharing is forbidden. Org/domain eligibility and quotas/consent must be proven. **Candidate for isolated pilot**, not a ready config toggle. |
| **A2 — Deployer-executed GAS + server-verified Google identity** | `USER_DEPLOYING` Google effective identity represents deployer, **not** the visitor. App could hypothetically verify an official Google OIDC ID token with signature, `aud`, `iss`, `exp`, domain policy `hd` if applicable, and stable `sub`; browser-provided email or unverified decoded JWT is never sufficient. | Google ID Token verification/nonce/replay protection and assurance are **not implemented** in this source; crypto/runtime, credential custody, token leakage/consent, MFA policy and authorized secure service execution require a separate design and proof. **Not chosen by this ADR**. |
| **B — External identity-aware backend / enforced gateway** | Trusted backend can validate identity, enforce MFA/RBAC/rate limits, manage server-side credentials and restricted storage | Adds service/infrastructure and must demonstrate direct `/exec` / `google.script.run` cannot bypass checks; not authorized now. **Escalation if A1 fails**, not a hidden implementation fallback. |
| **C — Keep local GAS password auth plus stronger throttling** | Retains current SHA/PBKDF2 accounts and application roles but inherits KDF, abuse, account management and recovery burdens | Cannot close R03/R04 by a Cache-only patch; R03 real GAS performance and modern hash-strength decision remain blocked. **Possible explicitly time-bounded contingency only**, never equal to managed MFA. |
| **D — Client-side Google Sign-In `credential` accepted on trust** | Deceptive: an unverified token or email is user-supplied data | **REJECTED**; do not build. |

Google's official documentation: `Session.getActiveUser().getEmail()` may be blank in contexts without the visitor's authorization; `Session.getEffectiveUser()` denotes the authority of execution, not inherently the browser caller. When executing as the accessing user, each caller grants OAuth and acts within **their** Sheet/Drive privileges. The deployer-run model does not provide visitor identity merely via Session. For OIDC ID Tokens, Google's guidance requires cryptographic signature verification, correct audience/issuer/expiry and `hd` when policy depends on a hosted domain; `sub` is a stable Google principal key. **No assertion in this ADR that those checks are already supported in Apps Script code**.

**MFA caveat:** A Google account is not automatically an organization-managed account, and sign-in alone does not prove that MFA is enforced. Workspace Admin can require 2-Step Verification for managed accounts; external/personal Google accounts require an alternate evidenced policy or exclusion. No organization tenancy, licenses, federated users, DPO approval or administrative authority have been verified.

## 4. Identity-to-RBAC binding and session transition contract

**Proposed identity model (requires separate schema/implementation approval):**

1. Authentication yields a **verified authoritative principal**, not a claimed email or mutable display name. For a verified OIDC flow use issuer + stable subject `sub`; if using a GAS Session email-only path, **do not call that an immutable subject**. Its continuity/rename risk must be explicitly mitigated by a trusted admin-provisioned mapping and future reevaluation.
2. Bind exactly one verified principal to a pre-existing Smart SRRT `UserID` using a **restricted provisioned mapping**, dual-person approval for high privilege and immutable audit provenance. Unknown principal: **DENY**, never auto-create an `active` user, never infer Role from email domain or client attributes.
3. After identity verification, reload `UserAccounts` or an approved authoritative staff directory, require `status='active'` and applicable `hasPermission_`. Existing `Super Admin`/`Manager`/`Admin`/`Staff` remain the application authorization model until a separate RBAC ADR approves changes.
4. If sessions are still needed, design `v3` opaque, time-limited, server-side sessions bound to `UserID`, trusted principal binding/version, account status and revocation epoch; password-hash-tagged v2 tokens **must not be treated as managed identity sessions**. Reject mixing v2 local-auth bearer tokens into MFA-only RPCs. Session cache eviction must invalidate rather than grant access. Verify reset, disable, role change, offboarding, changed actor and revoked IdP access at all private RPCs.
5. A new source mode must be **server-pinned and deny by default**, with explicit temporary gates for any dual-auth pilot. If password login remains publicly callable while managed identity is considered mandatory, MFA is **bypassable**. Disable or isolate local `login`, `registerUser`, reset/recovery and legacy session acceptance in protected managed-only releases. Do not erase or revert stored password hashes simply to "complete" migration.
6. Privileged GS-S1 operator maintenance must continue as a **separate** dual-Google-identity / vetted editor workflow. Managed app sign-in or the `Super Admin` role cannot invoke installer, migration or credential-reset public entrypoints without this guard.

### Data and integrity preservation

Preserve stable `UserID`, EventID/Revision/OwnerUserID, role/status approvals, audit actor linkage, ReportRegistry histories, attachment metadata, existing report documents/links and schema v7 until separately approved migration. Do not silently remap event ownership to email, Google subject or row number. An identity mapping addition and session v3 is an **explicit schema/protocol change**, not a documentation-only tweak. Existing user passwords/hashes stay private; no bulk hash export, downgrade, forced reset or public migration evidence.

## 5. Proposed phased implementation and rollback — all NOT AUTHORIZED

| Phase | Proposed activity after separate approval | Exit / STOP |
| --- | --- | --- |
| **H0 — Discovery (read-only, separately approved)** | Restricted actual operator, managed account population, tenancy/MFA enforceability, external collaborators, active `/exec` manifest/access/`executeAs`, OAuth scopes, File/Sheet permission matrix and existing data custodian; inventory public/private RPCs, `doGet` ALLOWALL embed behavior, user account states. No personal data in GitHub. | Unknown effective identity, external accounts without MFA, unclear data custody or accidental production path => **STOP** |
| **H1 — Architecture selection** | Human decision A1 vs A2/B/C; choose P/S/O isolation; choose identity subject binding, roles, session mechanism, access/privacy notice and delegated least-privilege execution; approve cost/licenses if needed | No owner decision, security/DPO gate, full path protection or feasible data ACL => **HOLD** |
| **H2 — Synthetic source contracts** | New scoped Feature PR for new identity adapter, mapping and v3 sessions with RED tests, explicit mode gates; frozen One-Click untouched | Fail if any legacy session can skip required managed identity, any unguarded public RPC or client-claimed role/email |
| **H3 — Isolated non-production proof** | New separately approved GAS project(s), synthetic user, test staff/external/guest, data, Drive/Docs and OAuth; verify P/S/O segregation, identity blank cases, user scopes, operator RPC and R03/R04 behavior | Fail on unauthorized data exposure, insufficient scopes/data ACL, broken ReportRegistry/Gemini handling, unverified MFA/identity |
| **H4 — Migration rehearsal** | Privately stage identity binding, user offboarding, live-looking synthetic events/attachments/AI reports; compare unchanged source record counts and IDs; rehearse forward-compatible recovery | Fail if `UserID` or event ownership changes, v2 session survives in MFA-only, identity mapping duplicates/collides or restored hash snapshot loses data |
| **H5 — Production Human Gate** | Only after R01–R08, R03/R04, R05 audit/DPO and R06 manifest all resolved, immutable artifact/backups checked, human deploy authorization and rollback owner named | **Not approved** by this ADR/PR; Production remains HOLD |

**Rollback boundary:** A downgrade to pre-GS-S3 SHA-only code is unsafe after any PBKDF2 migration; a downgrade to password-auth-only code would also bypass a newly enforced managed identity policy. An acceptable fallback after cutover must be a **separately reviewed, immutable, access-controlled, managed-identity-compatible** artifact (or isolated read-only pause) that retains v3 session checks, required data integrity and GS-S1–S5 controls. **Do not claim such an artifact currently exists.** Restoring an old Sheet snapshot or reverting user hashes is prohibited without separate approved reconciliation of newer writes. Backups and simulation must prove source, manifest, OAuth, user binding, records and report references can be recovered without exposing secrets.

## 6. Required acceptance / rejection criteria

- **ID-01**: blank `Session.getActiveUser()`, attacker-supplied email, wrong/unverified OIDC token, unexpected audience, issuer, expiry or hosted-domain requirement, replayed token and missing MFA-policy evidence all fail closed.
- **ID-02**: only individually provisioned bound principals can access private RPCs; unknown/external/disabled/pending/stale/removed users cannot mint or reuse protected sessions; no auto-promotion by domain or username.
- **ID-03**: v2 legacy tokens rejected by managed-only private paths; v3 credentials bind principal, account status/role and revocation; no direct `google.script.run` or alternative `/exec` access bypasses identity checks.
- **ID-04**: public delivery has **no private callable RPC or credential-bearing source** and cannot read private storage; R08 small-cell controls verified before exposing any new public view.
- **ID-05**: every role's Sheets/Drive/Docs/Report/Gemini workflow is tested with its **actual** Google OAuth/ACL execution identity on isolated synthetic assets; no broad data-sharing workaround.
- **ID-06**: GS-S1 operator-only paths deny from ordinary staff Web App and remain usable in the approved operator context; no hidden private mutation accessible via public code.
- **ID-07**: user status, role changes, Google deprovisioning, password legacy hash retention and session cache failure cannot silently grant access; privacy/audit outputs do not contain tokens, hashes or health narratives.
- **ID-08**: pre/post migration equivalence for UserID, EventID/Revision, ownership, attachments, ReportRegistry, AuditLogs and retained schema; rollback/forward-fix rehearsal on synthetic assets without data loss.
- **ID-09**: assessed external/non-domain users, lost MFA device, account recovery and access recertification process; no secret support backdoor or default privileged account.
- **ID-10**: exact reviewed GitHub SHA, 24-file/current packaging baseline (or separately approved topology), manifest/executeAs/owner inventory, staging CI/UAT evidence and separately authorized Production go/no-go.

**Decision request after ADR merge:** authorize **only H0 scoped discovery**, or explicitly reject/change the proposal. Merge of this documentation alone does not commit to A1/A2/B/C. No code implementation may begin under this ADR's authority.

## 7. References

- [RR-04 Corrective Design](rr-04-login-abuse-corrective-design.md); [RR-03 KDF and Abuse Plan](../implementation/rr-03-kdf-login-abuse-readiness.md); [RR-02 Operator/Manifest Preflight](../implementation/rr-02-operator-manifest-preflight.md); [RR-01 Dual-verifier Rollback](../implementation/rr-01-authentication-rollback-compatibility.md)
- Google: [Web Apps and executeAs](https://developers.google.com/apps-script/guides/web), [Session active/effective user](https://developers.google.com/apps-script/reference/base/session), [Authorizing Google Services](https://developers.google.com/apps-script/guides/services/authorization), [Deployment configurations](https://developers.google.com/apps-script/api/reference/rest/v1/projects.deployments)
- Google Identity: [Verify ID Token on the server](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) — cryptographic signature, audience, issuer, expiry, and hosted domain policy; do not equate client display name/email with verified principal
- Google Workspace Admin: [2-Step Verification and enforcement](https://support.google.com/a/answer/175197) — admin-managed policy, not a property proven by an ordinary Google login page
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html); [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
