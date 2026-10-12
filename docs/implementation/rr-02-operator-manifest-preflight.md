# RR-02 — Non-production Verification Plan and Operator/Manifest Preflight

**Prepared:** 2026-10-12 (Asia/Bangkok)  
**Exact source base:** \`main@9e3420c0680d29a9a9668df19ce7c3190bf7e307\` (RR-01 PR #103 merged; post-merge Actions [#38218077612](https://github.com/9GotStory/smart-srrt/actions/runs/38218077612) SUCCESS: 64 contracts, 423 regressions, Native 24-file parity; \`releaseDecision=HOLD\`).  
**Scope of this PR:** Documentation and review of committed sources **only**. No connected Google Apps Script/Workspace, no production configuration inventory, no staging creation, no browser UAT and no source/deployment mutation.  
**Review type:** ChatGPT author-assisted Technical Review, **not independent security validation**.  
**Authority:** \`APPS_SCRIPT_DEPLOYMENT=HOLD\`; source Merge (if later approved) is not staging or production permission.

## 1. Purpose, stage boundaries and trusted facts

RR-02 prepares evidence to adjudicate **R02: privileged Google operator identity**, **R06: manifest/OAuth/deployment and rollback controls** and the setup prerequisites for **R07: isolated integration**. RR-01 tested dual SHA-256/PBKDF2 handling with synthetic VM fixtures only. **R01 still has no real Apps Script recovery rehearsal**, and R03–R05/R08 remain open.

Three separate artifacts MUST be identified and never conflated:

1. **GitHub source**: an immutable approved exact \`main\` commit; current Native project is 7 \`.gs\` files + 16 HTML partials + generated \`Index.html\` = **24 source files**. \`dist/apps-script/\` is generated, not committed. Frozen root One-Click files must not be edited.
2. **Apps Script project editable HEAD**: potentially distinct from GitHub and live Web App; the *actual project* has a separately managed \`appsscript.json\`, OAuth permissions, Script Properties, identifiers, source and access controls, none established by CI.
3. **Published Web App deployment**: deployment ID points to a particular immutable project version, access policy and execution identity. The \`/exec\` URL does not necessarily run editable HEAD; \`/dev\` executes most recently saved code for editors and must never be used as proof of live \`/exec\` parity.

Current GitHub source in \`src/server/00-bootstrap.gs\` enforces \`requireTrustedOperator_\`: \`GS_TRUSTED_OPERATOR_EMAIL\` must be one valid configured email and **both** nonblank \`Session.getActiveUser().getEmail()\` and \`Session.getEffectiveUser().getEmail()\` must match. A Smart SRRT username/password session, matching *effective user alone*, browser button visibility or existence of the Spreadsheet custom menu does not authorize operator work. There are 15 guarded public privileged functions across \`00-bootstrap.gs\`, \`01-schema-and-db.gs\`, \`05-reports-and-models.gs\` and \`06-gemini-and-prompts.gs\`. Their names are in [GS-S1](gs-s1-operator-rpc-boundary.md). \`include(filename)\` remains public for trusted HTML fragment expansion and validates the 16-item allowlist.

**Google platform caveat:** \`getActiveUser().getEmail()\` can be **blank** when access does not entail that user's own authorization, especially a Web App running as its deployer; same-domain/editor conditions can differ. \`getEffectiveUser()\` reflects the authority of execution, **not the browser caller**. \`executeAs=USER_ACCESSING\` can require users to authorize scopes and must not be silently substituted for \`USER_DEPLOYING\`. Source checks prove expected fail-closed behavior, **not** that a particular live user context will make the operator workflow usable.

References (Google official):
- [Session active/effective identity](https://developers.google.com/apps-script/reference/base/session)
- [Web Apps, execution identity, /dev vs /exec](https://developers.google.com/apps-script/guides/web)
- [Web App manifest access/executeAs enums](https://developers.google.com/apps-script/manifest/web-app-api-executable)
- [Deployments API — version, access and executeAs](https://developers.google.com/apps-script/api/reference/rest/v1/projects.deployments)
- [Apps Script quotas/limits, subject to change](https://developers.google.com/apps-script/guides/services/quotas)

## 2. Approval gates (all currently NOT RUN)

| Gate | Authorized activity after NEW explicit Product Owner approval | Forbidden until separate authorization | Deliverable |
| --- | --- | --- | --- |
| **A — Source documentation (this PR)** | Inspect GitHub code/docs and official specifications; write a plan and empty evidence template; use GitHub Actions | Any Google project, Workspace, Script Property, secret or patient record read/write | PR exact SHA, documentation-only diff, source CI |
| **B — Restricted existing-deployment metadata inventory** | Named authorized operator collects **read-only**, minimally necessary deployment and identity metadata into a restricted private record | \`clasp push\`, \`update-deployment\`, \`clasp pull\` of production source without separately approved sensitive-backup controls; password reset, installer, Gemini, patient data or Script Properties mutation | Sanitized evidence flags, opaque references; release configuration differences |
| **C — Isolated staging preparation** | After separate approval, owner provisions a **new non-production project** with synthetic Sheet/Drive/Docs and explicit test identities; isolated manifest and scoped access | Pointing staging to real Sheets, shared production folders, API keys, accounts, jobs, audit archives or real patient narratives | Staging asset inventory held outside Git, owner/custodian |
| **D — Non-production identity + synthetic integration** | After separate approval, run exact staging cases from sections 3–5 and approved RR-01/R03/R07 tests | Invoking mutable privileged RPCs against production; unapproved live Gemini, tests with patient data | Outcome, timings, denials, immutable version and rollback rehearsal evidence |
| **E — Production cutover** | **Not authorized in RR-02**; requires R01–R08 closed and new deployment-specific Human Gate | ALL \`clasp push\`, \`update-deployment\`, live migration and account operation | Formal release approval and post-deploy verification, not this PR |

The existing \`tools/deploy-g34-clasp.sh --preflight\` is **NOT an offline GitHub-only command**: it fetches Git refs, performs a real \`clasp pull\`, lists actual remote versions/deployments and writes private backup/source files locally. Although it does not push in \`--preflight\` mode, it **requires separately approved access and confidential backup handling** (and may retrieve sensitive material). Do not invoke it to satisfy Gate A or assume that read-only remote retrieval is automatically approved. Its \`--deploy\` mode makes remote changes and is prohibited here. By contrast \`npm run release:preflight\` is strictly offline after creating the generated Native stage.

## 3. R02 operator identity test design (non-production only)

All synthetic cases use an authorized **test operator**, separate **test non-operator**, no real account or credential. Tests must distinguish Spreadsheet Editor/Menu, Apps Script manual editor invocation, \`/dev\` (editor-only testing), and **published staging** \`/exec\`; record each context, version and expected authority **without ever recording full emails/tokens in public CI/GitHub**.

| ID | Configured operator | Active user | Effective user | Expected \`requireTrustedOperator_\` outcome |
| --- | --- | --- | --- | --- |
| OP-01 | Missing/empty | Operator | Operator | **DENY**, no downstream side effects |
| OP-02 | Invalid/multiple | Operator | Operator | **DENY**, no downstream side effects |
| OP-03 | Test operator | Empty/unavailable | Operator | **DENY**; effective alone is insufficient |
| OP-04 | Test operator | Other actor | Operator | **DENY** |
| OP-05 | Test operator | Operator | Other actor/empty | **DENY** |
| OP-06 | Test operator | Operator | Operator | **ALLOW at the guard only**, then stop at a synthetic non-mutating sentinel |
| OP-07 | Test operator | Anonymous/unavailable Web App actor | Test deployer | **DENY**; confirm no operator escalation through \`google.script.run\` |
| OP-08 | Test operator | Test non-operator with normal Smart SRRT login | Operator/test deployer | **DENY** for operator operations regardless of application role |

For OP-06 in actual staging, use a separate **reviewed non-mutating diagnostic wrapper/test harness** that invokes only the guard and returns a bounded boolean/status classification. Do **not** invoke \`installSmartSRRT\`, \`setupDatabase\`, \`resetSuperAdminPassword\`, \`migrate*\`, audit archiving, or Gemini diagnostic functions as a positive guard test: after authorization those functions can mutate state or access external services. Guard diagnostics must not return actor emails, Script Properties values, OAuth tokens or stack traces. If safe guard-only observation is not possible in the approved staging context, record **NOT_TESTABLE**, not PASS.

For Web Apps, test both \`USER_DEPLOYING\` and \`USER_ACCESSING\` **only if separately authorized and provisioned on isolated staging**; do not assume switching execution identity preserves original functionality. Before every case record actual access enum (\`MYSELF\`, \`DOMAIN\`, \`ANYONE\`, \`ANYONE_ANONYMOUS\`) and exercise the case only with a permitted synthetic actor. Failure to retrieve active identity must result in **DENY**, not fallback to effective user or a hardcoded account.

Pass criteria: all negative cases deny before mutation; legitimate operator context passes the **guard-only** probe; no unauthorized public function or report/admin RPC gains rights. Any unexpected allow = **STOP / security finding**. A negative case passing does **not** by itself prove availability of the operator menu in production.

## 4. R06 manifest, deployment, OAuth and backup inventory

The inventory is a **future restricted operator task**, not a current claim. Collect *types and booleans in the public evidence*, and keep sensitive identifiers/actual file bytes in an access-controlled evidence vault with designated owner. Required fields:

| Domain | Verify, with exact source | Gate if absent or conflicting |
| --- | --- | --- |
| Project identity | Staging vs existing prod clearly different; actual Script ID kept private; ownership/deployer authorized | STOP on unknown ownership or accidental prod target |
| Web App version | Immutable version number, deployment ID and target \`/exec\` mapping from current deployment metadata; optional \`/dev\` labeled nonproduction/head only | STOP if HEAD/version conflated |
| Actual manifest | Backed-up \`appsscript.json\`; \`runtimeVersion=V8\`; exact \`oauthScopes\`, \`webapp.access\`, \`webapp.executeAs\`, logging and exception settings reviewed, plus other relevant fields | STOP if missing; do not invent/replace OAuth scopes |
| Published entrypoint | Inspect actual deployment \`entryPoints\`/WebApp config and reconcile with manifest and recorded version; note deployment-level differences | STOP on ambiguous \`executeAs\` or exposure |
| Operator prerequisites | Presence/format of \`GS_TRUSTED_OPERATOR_EMAIL\` reported as flags only, actual configured account verified privately; authorized actor/editor privileges | STOP if active/effective mismatch or email blank in intended path |
| Source and package | Exact approved Git SHA, Native 24 files, \`Index.html\` inclusion/order, seven server files, no duplicate legacy scripts, manifest preserved separately | STOP on source/drift or unexpected remote file |
| Recovery assets | Tested restore of source/manifest, immutable deployment version, permissions, synthetic Sheets/Drive/Docs references, schema/report/audit metadata; safe custodians and retention | STOP if restore, version pin or rollback target unknown |
| Credential compatibility | RR-01 rollback target **must support BOTH SHA-256 and PBKDF2** plus current safety boundary; no reverted pre-GS-S3 code or downgraded hashes | STOP if unsafe recovery artifact |
| Quotas/performance | Review service limits and real Apps Script PBKDF2 timing **in separately approved staging**, including 6-minute execution limit; verify current published quotas before test | R03 remains OPEN until measured |

Do not upload actual \`appsscript.json\` if it contains sensitive references; never paste \`.clasp.json\`, \`clasp\` authentication, OAuth access/refresh tokens, secret-bearing Script Properties, API keys, plaintext passwords, account hash values, unredacted AuditLogs, report text or patient IDs to GitHub/CI. A list of OAuth scope **names** can be reviewed in a restricted record; public evidence should indicate scoped/approved/changed only.

## 5. R07 staging-only acceptance matrix (future approval required)

- **ST-01 Environment isolation:** staging Script ID, Sheets, Docs, Drive folders and allowed test identities are independent of production; URL/version and storage verified before execution; any production reference => **STOP**.
- **ST-02 Auth/rollback:** synthetic legacy SHA-256 and migrated PBKDF2 accounts authenticate; RR-01 \`auto\` vs separately reviewed \`pause\` build; invalid stored formats fail closed; no downgrade/reset; maintain session credential-tag revocation.
- **ST-03 Operator & permissions:** OP-01–OP-08; staff/manager/admin routes, guest access and permission-denied cases; ensure no unguarded privileged RPC and no full event rows on public Dashboard.
- **ST-04 Report state:** first report, explicit regeneration consent, stale EventRevision, unknown job/Registry state, idempotent same-owner retries, cancelled or failed job before/after report commit; *use an approved fake response/isolated service configuration only*, never live production Gemini data.
- **ST-05 Audit and privacy:** synthetic audit append failure/recovery, sanitized logs, no plaintext/hashes in new audit; small-cell public aggregate/privacy remains R08 until approved.
- **ST-06 Recovery rehearsal:** stop/start isolated test version, restore immutable **dual-verifier-capable** candidate, compare synthetic UserAccounts, Registry and report references, ensure backups restore **without reverting newer credentials/data**. Do not claim recovered if not actually rehearsed.
- **ST-07 Failure/stop:** unexpected write, missing identity, OAuth scope change, external request, uncontrolled retries, unresolved KDF timing, manifest version mismatch or accidental production reference stops test and records an incident in restricted evidence.

No non-production test is executed by this PR. **No numeric performance acceptance threshold has been approved**; R03 owner must define it before a live benchmark. Do not treat synthetic Node durations as real GAS quotas or P95 performance.

## 6. Evidence handling, exit rules and next decision

Maintain the [RR-02 sanitized evidence template](../release/rr-02-nonproduction-evidence-template-2026-10-12.md) with explicit \`NOT_RUN\`, \`PASS\`, \`FAIL\`, \`NOT_TESTABLE\` outcomes, dated reviewer, exact version/source SHA and restricted evidence reference; **blank fields cannot become PASS**. The authorized operator and Product Owner should retain full backups in restricted storage **outside** GitHub with independently verified restore and least privilege.

Completion of *this documentation PR* can close **RR-02 planning** only. It **does not close R02, R06, R07, R01 live readiness or R03–R05/R08**. After a separately approved controlled rehearsal, prepare a new evidence assessment and individual risk dispositions. Any unresolved blocker means \`DEPLOYMENT_READINESS=HOLD\`, irrespective of \`codeGate=PASS\`.

**Absolute boundary:** no Merge without a new explicit Product Owner approval, no production deployment authority, no \`clasp\` or Workspace calls, no Script Properties writes, no patient/account inspection, no Frozen One-Click edits.
