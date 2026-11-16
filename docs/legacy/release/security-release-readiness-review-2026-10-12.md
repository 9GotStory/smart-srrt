# Smart SRRT — Security Release Readiness Review

**Review date:** 2026-10-12 (Asia/Bangkok)  
**Repository:** [9GotStory/smart-srrt](https://github.com/9GotStory/smart-srrt)  
**Exact source baseline:** `main@7a8e2efeab239bac9bf708ed1e86f28b710f6726`  
**Review type:** read-only desk assessment of repository/source, documentation and Google Apps Script published specifications; **no access to live Apps Script, Workspace, production Sheets or credentials**.  
**Review author:** ChatGPT, author-assisted; **not independent security validation**.  
**Decision:** **SOURCE_CODE_GATE=PASS; DEPLOYMENT_READINESS=HOLD (NOT AUTHORIZED).**

## 1. Verified evidence, with explicit limits

- GS Architecture Improvement PRs **#95–#99 (GS-S1 through GS-S5) are merged into `main`**. Their source remediation covers privileged RPC operator identity, credential-safe new AuditLogs writes, versioned authentication, server-side report-regeneration consent and non-secret Audit write observability.
- [Post-merge GitHub Actions #38205839537](https://github.com/9GotStory/smart-srrt/actions/runs/38205839537) at the exact source baseline: **SUCCESS**, **60/60 contract tests**, **419/419 full regression tests**, Native **24 files** with staged-byte parity PASS, UI assets PASS, P6 `codeGate=PASS` and deliberate `releaseDecision=HOLD`.
- Native staging is seven `.gs` files plus 16 HTML partials and generated `Index.html`. The root frozen One-Click GS/HTML assets are legacy rollback/source evidence and **must not be edited**.
- The repository does not contain the **actual target Apps Script manifest** `appsscript.json` or actual OAuth/deployment access/execute-as authority; the deployment guide requires reading and preserving the real manifest from the authorized remote project. The operator-only `tools/deploy-g34-clasp.sh` is a **potential release tool**, not proof of a completed deployment.
- There is **no source-supported evidence** that the live `/exec` deployment runs this `main` SHA, or that its exact `executeAs`, access, effective user, active user, quota, stored Account versions, Script Properties, previous job state or rollback safety was evaluated. **No Apps Script execution, credential reset, data migration or `clasp` activity was performed by this review.**

**Interpretation:** Passing source/CI gates closes the reviewed code tasks; it does **not** authorize a production cutover, security certification, or actual patient-data processing with the new version.

## 2. Blocking release gates

| Gate | Severity | What is verified from source | Evidence required to exit HOLD |
| --- | --- | --- | --- |
| **R01 — Authentication rollback compatibility** | **BLOCKER** | GS-S3 converts successfully authenticated legacy SHA-256 credentials into `pbkdf2-sha256$...` in `UserAccounts`; the old pre-GS-S3 `login` compares only `hashPassword_(password)` as single SHA-256. A rollback of code **without data-compatible authentication** will deny login for migrated accounts. | Design and verify a **forward-compatible recovery/rollback release** or explicitly approved tested account-recovery strategy that handles PBKDF2 and legacy hashes. Record exact rollback artifact, runbook and decision owners. **Do not rewrite a PBKDF2 digest to SHA-256 or reset all live accounts to fabricate compatibility.** |
| **R02 — Privileged operator identity / execution context** | **BLOCKER** | Fifteen privileged functions require `GS_TRUSTED_OPERATOR_EMAIL` and matching nonblank `Session.getActiveUser().getEmail()` **and** `Session.getEffectiveUser().getEmail()`. The first can be blank for an execute-as-developer Web App; an effective execution account alone cannot prove browser caller identity. | Authorized **read-only** inspection of deployment ID, version, access, execute-as, project ownership and OAuth scopes; explicitly approve operator Google account/property and verify **non-production** menu/operator-denial behavior. No active-user fallback or blanket bypass. |
| **R03 — GS-S3 password KDF feasibility and security posture** | **BLOCKER** | New PBKDF2 verifier performs **12,000 serial `Utilities.computeHmacSha256Signature`** operations per new hash/legacy upgrade or password verify. Existing Node VM tests validate algorithm but not Google Apps Script runtime cost. Google documents a **6-minute script execution** limit; `12000` is a transitional work factor, not an evidence-based production setting. | In an isolated test project benchmark real GAS KDF timings, P95 login/worst-case concurrent logins, quota limits, first-time upgrade and account reset, with explicit performance/security threshold and approved decision. Consider managed identity or a suitably vetted verifier if performance/security tradeoffs are unacceptable. |
| **R04 — Credential stuffing and rate-control threat model** | **BLOCKER for broad/public access** | GS-S3 login limit uses ScriptCache counters by normalized email; cache can evict, and rotating target accounts or clients evades any one-account key. It is a best-effort control rather than trusted user/IP/global throttling. | Owner-approved threat model for intended `access` and app audience, abuse/traffic safeguards, safe error handling, monitoring and validation. Do not treat ScriptCache as a guaranteed perimeter. |
| **R05 — Historical GS-S2 audit exposure** | **BLOCKER until restricted owner disposition** | GS-S2 masks *new* structured credential-bearing AuditLogs writes. Earlier code could have written plaintext `newPassword` or PasswordHash into active logs, archived spreadsheets, exports or backups. Their actual content has **not** been reviewed. | Confidential, minimum-access owner/DPO-approved historical exposure assessment, containment, credential rotation strategy as needed and retention/forensic-preservation decision. **No bulk reading, deletion, archive modification or credential export in this PR.** |
| **R06 — Native Apps Script deployment and recovery controls** | **BLOCKER** | Native 24-file source staging passes CI; generated package omits remote `appsscript.json`. `clasp push` affects mutable remote project source and `update-deployment` affects live release. A source merge is not a deployment. | Proven backup/restore of live source, Manifest/OAuth, Script Properties, deployment IDs/versions, Sheets, Drive templates/folders and job/report evidence as appropriate. Exact 00–06 load order, staged allowlist, version pin and separately authorized release/rollback plan. Preserve frozen One-Click. |
| **R07 — Isolated integration and report/idempotency behavior** | **BLOCKER** | GS-S4 Node VM tests cover fresh Registry/Revision, one-use consent and unknown-job denial; GS-S5 synthetic telemetry tests pass. They do not exercise Apps Script identity, Sheets race/quotas or genuine Google Docs/Gemini semantics. | Isolated test fixtures for first report, confirmed regeneration, stale/unknown report, existing Registry, cancel/commit boundary, failed AuditLog append, Admin degraded/recovered status, invalid report ID, permissions and controlled recovery. **Never test by resetting a live Super Admin or invoking real production Gemini/patient workflows.** |
| **R08 — Health data and Gemini privacy decisions** | **BLOCKER for clinical production use** | The system sends event narratives to Gemini and displays public aggregated disease/location metrics. Source tests do not determine lawful basis, health data minimization or aggregation re-identification risk. | Product Owner/DPO review of data sent to external services, necessary processing/notice, data retention, role-based visibility and small-count public aggregation policy. Record an explicit disposition, not an implied PDPA certification. |

### Further operational constraints (non-blocking to *documentation*, material to launch)

- **GS-S4:** An authenticated caller can request both consent RPCs programmatically; the capability proves server-authorized two-step intent with fresh data, **not physical human confirmation**. Unknown-job reconciliation is a manual operational boundary; consent stored in Script Properties must obey storage/expiration limits.
- **GS-S5:** Audit health marker count is best-effort and non-atomic. `unobserved` does **not** mean every Audit append was successful; `recovered` does **not** replay missing historical records. Design alert ownership and playbook before interpreting it as live incident monitoring.
- Google currently documents **9 KB per Script Property value**, **500 KB total property store**, **6 minutes per execution** (limits may change). Temporary consent cleanup and 24h report metadata need capacity review under likely concurrency.
- Existing `docs/implementation/gs-s1...` through `gs-s5...` were authored as PR candidates and may still say “NOT MERGED”; verify the **GitHub PR state/commit** for *source merge status*, and do **not** confuse “merged” with “deployed.”

Official platform references:
- [Apps Script Session — active/effective identity](https://developers.google.com/apps-script/reference/base/session)
- [Web App execution identity and authorization](https://developers.google.com/apps-script/guides/web)
- [Web App manifest access and executeAs](https://developers.google.com/apps-script/manifest/web-app-api-executable)
- [Apps Script Utilities HMAC API](https://developers.google.com/apps-script/reference/utilities/utilities)
- [Apps Script quotas and limits](https://developers.google.com/apps-script/guides/services/quotas)

## 3. Recommended next work packages — no production access

**RR-01 (first): Authentication rollback design — documentation + tests.** Confirm source-only reversible upgrade strategy for legacy SHA-256→PBKDF2 without copying or reading real credentials. Propose a compatibility rollback artifact and synthetic end-to-end verification. This must not silently undo GS-S1/S2 security improvements.

**RR-02: Non-production verification plan and operator/manifest preflight.** Document exact evidence required, expected denial cases, tested roles, input fixtures and no-production-data constraints. Separate read-only live deployment inventory from any staging mutation and collect only sanitized metadata.

**RR-03: Password/KDF benchmark strategy and rate-control decision.** Specify a benchmark script to be run only after isolated project approval, immutable timing/quotas evidence, failure thresholds, a safe KDF/identity-provider fallback, and decision owners. No 12k→smaller tweak merely to get green CI.

**RR-04: Historical audit risk treatment + data privacy review.** Approval and confidentiality-controlled procedure only; do not inspect, export or delete patient/user records without authority.

**RR-05: Integration and rollout rehearsal.** A separately approved *non-production* Native deployment with synthetic data, owner-specific operator identity verification, first/duplicate/unknown report scenarios, actual Auth/Cache/Lock behavior, and tested rollback. Only then consider a separately authorized Production Deployment PR/Runbook.

## 4. Governance and exit criteria

- **No new architecture layer, database, framework, container or arbitrary split of the seven GAS files.** Native multi-file remains canonical. Frozen One-Click stays untouched.
- GitHub source changes use dedicated branches/PRs, exact SHA/allowed-file checks, existing CI, author-assisted ChatGPT Technical Review, and separate explicit Product Owner **Merge** approval.
- **Apps Script deployment is an independent Human Gate**. This review authorizes **no** `clasp push`, `update-deployment`, installer, migration, Super Admin reset, Script Properties changes, real account/password change or production Sheets/Drive/Gemini mutation.
- To change **DEPLOYMENT_READINESS** from HOLD, produce an evidence packet with named approvals and test/rollback outcomes satisfying **R01–R08**. Otherwise **HOLD**, even when automated `codeGate=PASS`.

**FINAL DESK-REVIEW DECISION: SOURCE=PASS; OPERATIONS=UNVERIFIED; PRODUCTION_DEPLOYMENT=HOLD.**
