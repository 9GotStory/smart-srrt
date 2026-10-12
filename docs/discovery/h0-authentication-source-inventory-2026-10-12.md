# H0-A — Authentication Source Discovery and Gap Assessment

**Date:** 2026-10-12 (Asia/Bangkok)  
**Exact GitHub baseline:** `main@9bab0d5354aaeefae3d038c2c914f4717fc9adb9` (ADR-AUTH-01 PR #107 squash merged, post-merge CI 64 contracts/423 regressions, 24 Native stage, `releaseDecision=HOLD`).  
**Classification:** **H0-A GitHub source inventory only**. Not H0-B live/operator inventory, not architecture acceptance, not independent security review and not Apps Script deployment approval.  
**Author/reviewer:** ChatGPT author-assisted Technical Review.  
**Gate:** `H0_A=SOURCE_DISCOVERY`; `H0_B=NOT_AUTHORIZED/NOT_RUN`; `ADR_AUTH_01=PROPOSED`; `R01-R08=OPEN`; `APPS_SCRIPT_DEPLOYMENT=HOLD`.

## 1. Scope and source of truth

H0-A uses the committed `src/server/`, `src/web/`, `tools/`, tests and the merged [ADR-AUTH-01](../architecture/adr-auth-01-managed-identity-transition.md). The **live** Web App source, access policy, user/owner identities, `appsscript.json`, OAuth scopes, Google tenant/MFA enforcement, real account counts and actual Sheets/Drive/Docs/Gemini authorization **were not queried** and must remain `UNKNOWN`.

**Current canonical Native topology:** 7 Apps Script server modules + 16 ordered HTML partials + generated `Index.html` = **24 generated source files**, excluding actual project `appsscript.json`. Historical One-Click artifacts remain frozen. A GitHub source or tests PASS does not prove Apps Script project editable HEAD or the immutable `/exec` deployment version. The operator-only `tools/deploy-g34-clasp.sh --preflight` would run `clasp pull`/list remote deployments and write private backups: **do not run it under H0-A**.

## 2. Frozen non-underscore server declaration inventory

At the exact source baseline, there are **70 top-level function names not ending in underscore** (checked against `tests/gs-s1-operator-rpc-boundary.test.mjs` explicit name inventory). This is a **source-level callable-surface inventory**; Apps Script special entrypoints `doGet` and `onOpen` have context-specific behavior. Do not infer every function is an authenticated browser RPC or automatically safe because a button is hidden. Google's HTML Service guidance confirms that ordinary public top-level functions are generally callable via `google.script.run`; only functions suffixed with underscore are excluded.

| Canonical source | Non-underscore names | H0 grouping |
| --- | ---: | --- |
| `00-bootstrap.gs` | 7 | `doGet`, `include`, `onOpen`; 4 GS-S1 privileged installer/setup/reset/info wrappers |
| `01-schema-and-db.gs` | 6 | 6 GS-S1 privileged migration wrappers |
| `02-auth-and-attachments.gs` | 14 | Local login/logout/self-registration, guest boot/lookup, authenticated assignment/attachments/master maintenance |
| `03-events-and-dashboard.gs` | 16 | Guest public aggregate/area lookup, authenticated raw Events, users, analytics, settings and logo |
| `04-admin-and-audit.gs` | 11 | Authenticated content, settings, audit, export/repair; **separate Spreadsheet Menu audit archive wrapper** |
| `05-reports-and-models.gs` | 14 | Report/consent/job APIs and 3 GS-S1 privileged Gemini diagnostic wrappers |
| `06-gemini-and-prompts.gs` | 2 | 2 GS-S1 privileged Gemini model-mode wrappers |
| **Total** | **70** | **15 explicitly GS-S1 operator-gated functions; other entrypoints need individual trust review** |

The **15 GS-S1 wrappers** are in `src/server/00-bootstrap.gs` (4), `01-schema-and-db.gs` (6), `05-reports-and-models.gs` (3), `06-gemini-and-prompts.gs` (2), checked by `requireTrustedOperator_` which requires `GS_TRUSTED_OPERATOR_EMAIL` and matching, nonblank active AND effective Google identity. Do not assume the guard is usable in every `/exec` mode. The `include` function is public for template expansion but validates an exact 16-partial allowlist.

**Specific H0-A finding H0-F01 (POTENTIAL AUTHORIZATION BOUNDARY, needs corrective review):** `src/server/04-admin-and-audit.gs:archiveAuditLogsFromSheetMenu()` is a non-underscore top-level function not among the 15 GS-S1 wrappers. It checks `Session.getActiveUser().getEmail()` and then a matching **active application user with the `audit` role**, before calling `archiveAuditLogsCore_`, which can archive and remove verified historical rows. This may be legitimate menu functionality but **is not equivalent to the separate GS-S1 dual-Google-identity operator guard**. It deserves a dedicated threat/call-graph and authorization review, especially under a future public `USER_DEPLOYING` web app. **Do not call it to test; no exploit or deployed vulnerability has been confirmed.**

## 3. Public/private/app/browser boundaries found in source

| ID | Source evidence | H0-A observation / why it matters |
| --- | --- | --- |
| H0-F02 — current single app | `00-bootstrap.gs:doGet` returns the complete `Index`; `google.script.run` in `src/web/03b-client-core.html` is a dynamic function-name bridge | Private/public pages currently share the source project; menu/UI filtering alone cannot separate protected RPCs. A distinct minimal public artifact remains a proposed topology, **not implemented** |
| H0-F03 — iframe | `doGet` calls `setXFrameOptionsMode(ALLOWALL)` | Google documents that other sites may iframe an ALLOWALL page and it requires developer clickjacking defenses. Inspect whether protected staff flows need frame restrictions; do not flip without source/UX review |
| H0-F04 — local session | `src/web/03b-client-core.html` reads `SRRT_TOKEN` from `localStorage`; `03c-client-auth.html` stores and removes it after local `login`/`logout` | Persistent browser bearer token raises XSS/token-custody and device-sharing considerations; do not silently replace it with Google email or assume an IdP login automatically creates safe protected app sessions |
| H0-F05 — password/session | `01-schema-and-db.gs` `makeSessionToken_` requires `passwordHash` and stores v2 credential-tagged cache record; `02-auth-and-attachments.gs:getUserByToken_` reloads current account | Managed identity needs a new separately approved principal/UserID binding, session/revocation protocol and rejection of legacy password-session bypass (ADR-AUTH-01); old passwords/hashes cannot be downgraded or exported |
| H0-F06 — guest boot | `02-auth-and-attachments.gs:getAppBoot(sessionToken)` returns public-settings allowlist, `getMasterData`, `getAreaMaster`, `getPublishedContent` even if not logged in | An authorized minimal public redesign must explicitly decide which Settings, master names, village identifiers, published content IDs/URLs are permissible; these are not automatically anonymous-safe |
| H0-F07 — public aggregate | `03-events-and-dashboard.gs:getPublicDashboardData` reads filtered Event rows and returns aggregates, including `topVillage`, `byVillage`, `topDisease`, `byMonth`, disease group and risk | No source-level small-cell suppression is present in this aggregator; identifying small counts/village/disease may reveal a case by inference. **R08 open**; keep same aggregate minimization and forbid raw rows on PUBLIC |
| H0-F08 — protected data | `getDashboardData` calls `requireAuth_(token,'view')`; Event, Report, Attachment and Audit operations mostly use `requireAuth_` | Server-side RBAC `Super Admin/Manager/Admin/Staff` depends on existing UserID+role+status; future managed principal must not be allowed to supply role/identity and must preserve all events and ReportRegistry linkages |
| H0-F09 — registration | `02-auth-and-attachments.gs:registerUser` is publicly callable where `ALLOW_SELF_REGISTER` is true, starts accounts `pending`, exposes duplicate-email response and generates 12k HMAC PBKDF2 | The managed-only staff app must disable or isolate local registration/password RPCs; H0-B must establish real registration policy with authorization |
| H0-F10 — data identity | `01-schema-and-db.gs:requireAuth_` checks v2 token then role+status; `makeSessionToken_` binds session to password verifier | `Session.getEffectiveUser()` is **not visitor identity** in `USER_DEPLOYING` Web Apps. `Session.getActiveUser()` may be blank; no reliance on hardcoded or client-provided emails |
| H0-F11 — Drive publication | `03-events-and-dashboard.gs:uploadLogo` attempts `file.setSharing(ANYONE_WITH_LINK, VIEW)` for a logo file | This is a **logo-only code path**; not evidence that private attachments/reports are shared. An approved Public/Private split must inventory exact intended and actual sharing separately |
| H0-F12 — audit menu | `04-admin-and-audit.gs:archiveAuditLogsFromSheetMenu` uses Google active email + application audit role and can call mutating archive core | See H0-F01. Historical AuditLogs R05 privacy/retention and GS-S1 operator scope require a dedicated follow-up |
| H0-F13 — AI & reports | `05-reports-and-models.gs` uses ReportRegistry, Apps Script Properties report jobs and Drive/Docs; `06-gemini-and-prompts.gs` calls Gemini via UrlFetchApp | `USER_ACCESSING` changes which Google user needs Sheets/Drive/Docs permissions; data sent to Gemini and document ownership require R08/DPO, scope and location checks before choosing authentication topology |
| H0-F14 — bootstrap identity | `01-schema-and-db.gs:seedSuperAdmin_` chooses `Session.getEffectiveUser()` email or a hardcoded placeholder when installing an empty system and creates a generated initial password | **Installer is mutating and GS-S1 gated**, not called. H0-B must review operator onboarding and prevent placeholder/default owner use before any new deployment/identity migration |

**Additional review question:** `getPublishedContent` includes metadata `fileId`/URL in public published items; distinguish intentional public content from confidential Drive references before publishing an isolated public client.

## 4. Actual Google/Workspace facts still UNKNOWN (requires separate authorization)

| H0-B question | H0-A result | Owner/evidence requirement |
| --- | --- | --- |
| Staff Google identity tenancy, MFA/2SV enforcement, partner agencies/external accounts and offboarding | **UNKNOWN / NOT_COLLECTED** | Google Workspace/identity administrator; pseudonymized coverage counts and verified policy |
| Current live Script/Deployment/version, `webapp.access`, `webapp.executeAs`, actual manifest `oauthScopes`, ownership/editor roles | **UNKNOWN / NOT_INSPECTED** | Authorized operator, restricted read-only metadata; no project IDs or tokens in public issues |
| Current backing Google Sheet/Docs/Drive owners, access rights and per-user least privilege feasibility | **UNKNOWN / NOT_INSPECTED** | Data custodian; role-vs-ACL matrix with synthetic/test aliases only |
| Live anonymous RPC exposure, public event small cells, embed policy and private data leaks | **UNKNOWN / NOT_TESTED** | R08 privacy owner; separate approved isolated staging tests, no real patient records |
| Google `Session` active/effective availability per staff, partner and editor context | **UNKNOWN / NOT_TESTED** | RR-02 approved nonprod context cases, not a live privileged maintenance call |
| Actual password-hash mix, UserID mapping quality, audit archive provenance and integrity | **UNKNOWN / NOT_COLLECTED** | Protected aggregate-only assessment under R01/R05; never export raw passwords or hashes |
| Existing published gateway/direct `/exec` reachability, OAuth consent prompt and alternate deployment IDs | **UNKNOWN / NOT_VERIFIED** | Authorized owner + security reviewer; do not claim a proxy covers `google.script.run` without proof |
| Apps Script PBKDF2 runtime, concurrency, rate-limiter durability and rollback | **UNKNOWN / NOT_RUN** | R03/R04 separately approved synthetic staging |

**Public documentation MUST NOT include** actual staff lists/email addresses, patient Event records, passwords/hashes, service account keys, `.clasp.json`, Script Properties contents, tokenized `/exec` URLs, Script IDs, Google Workspace domain/private policy screenshots or full raw `appsscript.json`. Retain approved minimally necessary evidence in a restricted vault outside GitHub with owner, retention and access logs.

## 5. H0-A outcome, priority and next human gate

**H0-A can be closed for source-inventory completeness only after this docs-only PR's exact-head CI, author-assisted Technical Review and separately approved Merge.** It does **not** close H0-B, accept ADR-AUTH-01 or R01–R08. The next source-focused review should triage H0-F01 (public audit archiver context), H0-F03 (ALLOWALL), H0-F04 (browser token custody), H0-F06–F07 (guest/small-cell disclosure), and H0-F09 (registration) before implementation.

**Priority order for later risk disposition, not authorized code work:** first secure the public callable/mutating RPC inventory and separate public/private trust; then verify operator/data execution identity and MFA, then design v3 session/user binding and Migration/Recovery. Avoid source changes until the owner chooses A1/A2/B/C in ADR-AUTH-01.

**Next human approval request for H0-B must specify:** named operator and scope; whether only deployment metadata/MFA policy coverage or also Google file ACL metadata; target project class; no secrets/user rows; restricted storage reference, no mutation; permitted tools; abort conditions. **The present “continue” authorizes H0-A source review, not automatic live Google identity/config inspection or `clasp`.**

**Status:** `H0_A=SOURCE_ONLY_DOCUMENTED`; `H0_B=NOT_RUN`; `ADR_AUTH_01=PROPOSED`; `R01_R08=OPEN`; `APPS_SCRIPT_DEPLOYMENT=HOLD`.

### References

- [ADR-AUTH-01](../architecture/adr-auth-01-managed-identity-transition.md), [RR-04 corrective design](../architecture/rr-04-login-abuse-corrective-design.md), [RR-02 operator/manifest plan](../implementation/rr-02-operator-manifest-preflight.md)
- [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web) — `/dev` vs `/exec`, execute-as behavior
- [Google Session identity](https://developers.google.com/apps-script/reference/base/session) — email availability and effective authority
- [HTML Service server functions](https://developers.google.com/apps-script/guides/html/communication) — non-private top-level functions may be called
- [HtmlOutput `XFrameOptionsMode`](https://developers.google.com/apps-script/reference/html/html-output) — `ALLOWALL` allows embedding, clickjacking responsibility
- [Apps Script deployments](https://developers.google.com/apps-script/api/reference/rest/v1/projects.deployments) — published access and execute-as configuration
