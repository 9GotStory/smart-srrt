# Smart SRRT — GS Security Release Readiness Review

**Review date:** 2026-10-12 (Asia/Bangkok)  
**Canonical source:** `9GotStory/smart-srrt@7a8e2efeab239bac9bf708ed1e86f28b710f6726`  
**Scope:** Read-only GitHub source, merged PRs, exact-main GitHub Actions evidence, official Google Apps Script documentation, and the guarded operator deployment script.  
**Classification:** **SOURCE GATES PASS / APPS SCRIPT DEPLOYMENT HOLD**. This review is author-assisted, not an independent security audit.

## Executive decision

**NO-GO for Apps Script deployment at this evidence level.** GS-S1…GS-S5 have been merged and source-regression verified. That is distinct from proving runtime identity, actual login latency, field permissions, data confidentiality or the existing Web App deployment configuration. Do not equate `codeGate=PASS` with `releaseDecision=GO`. The read-only P6 checker intentionally reports `releaseDecision=HOLD`.

No `clasp`, Script Properties, Google Sheets, Drive, Gemini, real clinical event, audit archive, report generation, installer, migration, account reset or deployment was accessed/changed during this review.

### Verified GitHub source chain

| Phase | PR | Squash merge on main | Status |
| --- | --- | --- | --- |
| GS Architecture Review | [#94](https://github.com/9GotStory/smart-srrt/pull/94) | `b8e2c1043730f2ce9e9eed49e704ec7436cd23c9` | Merged |
| GS-S1 Operator RPC Boundary | [#95](https://github.com/9GotStory/smart-srrt/pull/95) | `378506e19d418739e13cfb12e171bb722300a439` | Merged |
| GS-S2 Credential/Audit Redaction | [#96](https://github.com/9GotStory/smart-srrt/pull/96) | `22ee59e10d1dc79b72c0846413d6793cb2eb8f10` | Merged |
| GS-S3 Authentication Modernization | [#97](https://github.com/9GotStory/smart-srrt/pull/97) | `4cb18cee7db1e814b6d4c85fc395d5a363b19c06` | Merged |
| GS-S4 Report Regeneration Consent | [#98](https://github.com/9GotStory/smart-srrt/pull/98) | `64f4cc3ae319319bac3ceb0818aad26d149d3200` | Merged |
| GS-S5 Audit Observability | [#99](https://github.com/9GotStory/smart-srrt/pull/99) | `7a8e2efeab239bac9bf708ed1e86f28b710f6726` | Merged |

[Final main Actions run #38205839537](https://github.com/9GotStory/smart-srrt/actions/runs/38205839537): **SUCCESS** at exact main SHA. `check:contracts` **60/60 PASS**, full regression **419/419 PASS**, native source manifest/staged byte parity **24 files PASS**, UI asset check PASS, offline P6 `codeGate=PASS` / **`releaseDecision=HOLD`**. This is **source-only evidence**, not Apps Script project or browser-runtime certification.

The authoritative file set is **7 ordered `.gs` + 16 HTML partials + generated `Index.html` = 24 files**; a preserved real `appsscript.json` is **in addition** to those 24 files. The frozen legacy One-Click sources must remain untouched. Prior 14/16/18/21-file statements in historical implementation documents are snapshots, not current release instructions.

## Mandatory release gates and evidence owners

`PASS` below means verified *for source only*. No pending gate is inferred to have passed, and no production rollout approval has been given.

| ID | Review subject / acceptance evidence | State | Required evidence or disposition |
| --- | --- | --- | --- |
| R-00 | Exact source and CI | **PASS** | SHA, 24-file manifest and above Actions log verified |
| R-01 | Existing Apps Script deployment authority | **HOLD** | Privately record target Script ID vs Deployment ID, currently deployed immutable version, access level, `executeAs`, actual OAuth scopes/V8, existing `/exec` behavior; do **not** publish identifiers/secrets |
| R-02 | GS-S1 operator authorization | **HOLD** | In isolated non-production GAS project, provision a single approved `GS_TRUSTED_OPERATOR_EMAIL`; verify active *and* effective Google identities; demonstrate allowed editor maintenance context and negative web/blank/mismatched context without invoking destructive reset or migration |
| R-03 | GS-S3 real login/KDF latency | **BLOCKER** | Benchmark actual `Utilities.computeHmacSha256Signature` PBKDF2-12000 verification and one-time legacy migration in isolated GAS; capture representative latency/quota/error rate without passwords or digest values; decide a sustainable KDF factor / managed identity alternative |
| R-04 | GS-S3 session/rate-abuse perimeter | **HOLD** | Verify synthetic legacy login, new registration, password reset revocation and login throttle on isolated GAS; document a trusted global/per-client abuse response; CacheService per-email counters alone are insufficient |
| R-05 | GS-S4 Report Registry/Job runtime contract | **HOLD** | On synthetic event/report data only, verify first report, explicit reuse consent, invalid/mismatched tokens, expired/unknown job and registered Doc/Registry once-only behavior; keep no live Gemini/clinical records in scope |
| R-06 | GS-S5 audit transport status and GS-S2 historical exposure | **HOLD** | Synthetic append-failure/recovery + role-guarded Admin warning; separately authorize any restricted exposure assessment of old AuditLogs, archive spreadsheets, exports and backups before accessing them. Do not auto-redact, delete, export, rotate or migrate old data |
| R-07 | Secret-boundary residual: `getSystemSettings` | **BLOCKER — SOURCE CONFIRMED** | `src/server/04-admin-and-audit.gs` `getSystemSettings(sessionToken)` checks `settings` permission but returns `value:r[1]` for **all** settings. If `GEMINI_API_KEY` is stored there, any authorized settings-role browser client can receive its raw value. Determine least-privilege policy; prefer write-only/masked secret response with backward-compatible save semantics and regression tests in a **separate security PR**, or record a formal owner-approved restricted policy before a release decision |
| R-08 | UI framing and guest privacy | **HOLD** | Confirm need for `doGet().setXFrameOptionsMode(ALLOWALL)`; review embedding/clickjacking policy and guest aggregate small-cell exposure against actual product policy and representative synthetic values |
| R-09 | Quotas, concurrency, properties budget | **HOLD** | Estimate/measure peak 6-minute execution constraint, concurrent sessions and ScriptCache eviction. Confirm G-32 job records, GS-S4 consent properties and GS-S5 audit-health metadata remain within Script Properties caps under intended traffic; test rejected/stale properties without real patient data |
| R-10 | Source package, backup, cutover and recovery | **HOLD** | In a separate test project, confirm 7 GS + 16 partials + Index and V8 acceptance; verify preserved manifest/scope, private backup + rollback to prior immutable deployment; operator-only guarded `--preflight` is a separate approved operation; no `--deploy` without a second explicit go/no-go |
| R-11 | Human release authority | **HOLD** | Product Owner approves exact SHA, target, test evidence, risk decisions, release window and rollback plan **separately** from any GitHub PR merge. P6 must remain HOLD without that approval |

### Google documented runtime constraints (verified 2026-10-12)

- Google warns `Session.getActiveUser().getEmail()` may be **blank** in Web Apps executing as the developer (and other contexts without user authorization). `getEffectiveUser()` under execute-as-developer identifies that developer and is **not** proof of the current browser operator. GS-S1 intentionally fails closed on missing/mismatched identities: <https://developers.google.com/apps-script/reference/base/session> and <https://developers.google.com/apps-script/guides/web>.
- Google states **6 minutes per execution**, **30 simultaneous executions per user**, **1,000 per script**, **9 KB per Properties value** and **500 KB per Properties store**; limits may change. These are ceiling and planning data, **not** evidence of throughput or performance: <https://developers.google.com/apps-script/guides/services/quotas>.
- Google documents `Utilities.computeHmacSha256Signature(byte[],byte[])`, but the PBKDF2 loop's actual latency has **not** been measured on a target GAS runtime: <https://developers.google.com/apps-script/reference/utilities/utilities>.
- Web-app deployment may execute as the owner or as the accessing user, with different authorization/granular consent consequences: <https://developers.google.com/apps-script/guides/web>.

## Key source-verified residual findings

1. **R-07 raw settings secret response is not closed by GS-S1…S5.** The public browser RPC has a valid `settings` permission guard, so this is not proof of anonymous access. The remaining concern is **least privilege** for users who have settings permission and raw API keys. The appropriate correction is a dedicated, narrow PR—do not silently change settings functionality in a readiness-documentation PR.
2. **GS-S3 PBKDF2-12000 is transitional.** Local Node VM/crypto tests demonstrate correctness of algorithm output; they do not prove Apps Script 6-minute feasibility, secure password work factor or distributed brute-force protection.
3. **GS-S4 consent tokens and G-32 job metadata share bounded Script Properties.** The 5-minute proof is server-issued, but it is not cryptographic proof of a human click. Stale consent cleanup is opportunistic, and unknown jobs demand manual reconciliation. Quota and stale-data behavior need environmental evidence.
4. **GS-S5 telemetry is advisory, not a ledger.** `unobserved` does not mean every audit event was delivered; `recovered` does not recreate missing old audit entries. Counters are not concurrency atomic.
5. **GS-S2 protects new writes only once deployed.** Historical secrets may still exist in earlier AuditLogs/archives/backups. A read-only GitHub review is not evidence about actual records.
6. **A changing GitHub `main` is never deployment authority by itself.** Re-pin exact HEAD and target deployment metadata at the moment of any future approved operator action.

## Controlled evidence workflow — NO execution in this review

**Stage A — Documentation (this PR):** freeze evidence above; repair stale source/deployment documentation; create decision record. No side effects.

**Stage B — Separate explicit non-production authorization:** isolated Apps Script project and synthetic accounts/events/Docs, read-only project/deployment identification where permitted, identity and KDF measurements, RBAC/session checks, native package acceptance and rollback rehearsal. Record results without patient information, real passwords, API keys, Script IDs or Deployment IDs in public GitHub logs.

**Stage C — Remediate residual issues:** use a narrowly scoped PR for settings-secret handling (R-07); review guest privacy/frame policy, stronger authentication/perimeter protections and Script Properties capacity before another exact-SHA source review.

**Stage D — Human GO/NO-GO:** owner approves deployment of a **specific** `main` commit to an **identified** existing deployment only after all mandatory gates close. The operator's guarded `tools/deploy-g34-clasp.sh --preflight` is not a deployment and does not itself authorize `--deploy`. Preserve old deployment/manifest/source/version and a tested rollback.

**Current release verdict: HOLD.** This review does not schedule, perform or authorize deployment, account migration, historical audit remediation or any live operation.
