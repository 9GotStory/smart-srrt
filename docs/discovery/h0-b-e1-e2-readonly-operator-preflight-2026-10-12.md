# H0-B E1/E2 — Restricted Read-only Operator Preflight

**Date:** 2026-10-12 (Asia/Bangkok)
**Exact GitHub baseline:** `main@da0601ede06ea13ce34d36b8521518e733de4205` (PR #108 merged; post-merge CI SUCCESS, 64 contracts, 423 regression, 24 Native stage, P6 `releaseDecision=HOLD`).
**Classification:** Documentation-only procedure and blocked-evidence record. No Apps Script, Workspace Admin, Google identities, Script Properties, deployment IDs, or live data were read; no write or deployment.
**Current gate:** `H0_B_E1=BLOCKED_NO_AUTHORIZED_ADMIN_EVIDENCE`; `H0_B_E2=BLOCKED_NO_SCRIPT_DEPLOYMENTS_ACCESS`; `ADR_AUTH_01=PROPOSED`; `R01_R08=OPEN`; `APPS_SCRIPT_DEPLOYMENT=HOLD`.

## 1. Capability check and operator boundary

Connected tools were checked for a scoped Apps Script Projects/Deployments API and Google Workspace Admin Directory/Security Reports. GitHub supports the exact source review. Connected Google Drive offers Drive file metadata, search and content, **not** Google Admin 2-Step Verification configuration or the Apps Script Deployments API. Plugin discovery did not find a connected equivalent in the present tool set. **Do not reinterpret Drive search or an incidental file owner email as organization-wide identity/MFA evidence or deployment settings.**

The Product Owner asked to continue E1/E2 read-only discovery, but the specific authorized Google administrator, target Apps Script project, OAuth permission, and restricted evidence custodian have **not been verified** in this runtime. Therefore, no Google-side request is attempted; this PR provides a minimal **operator-executable read-only protocol**, not a completed E1/E2 audit. Opening or merging this PR cannot grant Google permissions.

Never invoke `tools/deploy-g34-clasp.sh --preflight`: its remote `clasp pull` downloads source/manifest and creates backups, so it is **outside** this limited E1/E2 metadata scope. Never run `clasp push`, Apps Script installers/migrations, passwords resets, Gemini calls, Apps Script executions, or authenticated browser probes. No new OAuth client or scope is automatically approved by this runbook.

## 2. E1 — organizational identity and MFA coverage (Admin-owned, read-only)

**Precondition:** a named, organizationally authorized Google Workspace administrator validates the target tenant(s) and their right to view relevant security policy and reports. Workspace administration may be **not applicable** when accounts are personal/unmanaged; mark NOT_APPLICABLE instead of assuming a domain.

1. In an existing authenticated **Google Admin console** session, inspect **Security → Authentication → 2-step verification**. Review *effective* enforcement settings by relevant organizational unit/configuration group, including inheritance/overrides, exceptions and enforcement start date. Do not turn settings on or off. Official Google help: [Roll out 2-Step Verification](https://support.google.com/a/answer/9176657?hl=en).
2. Where administrator access includes reporting, inspect **Reporting → User reports → Security** and its 2SV enrollment/enforcement fields. Record **aggregated count bands** for relevant authorized cohorts, not names or rows. Distinguish *2SV allowed*, *2SV enrolled*, *2SV enforced* and *2SV enforced for ALL required private app users*. Admin-only policies do not prove general staff enforcement.
3. Classify staff/partner account cohorts: managed by one tenant; managed by another cooperating agency; personal/unmanaged Google accounts; accounts unable to use the proposed managed identity. If a class cannot be verified, mark **UNKNOWN**, not presumed enforced.
4. Record break-glass/recovery governance and account disable/offboarding existence as **YES/NO/UNKNOWN** from approved policy, without collecting users' recovery factors or backup codes.

**E1 minimal reviewed output:** `target_class` (INTERNAL/CROSS_AGENCY/MIXED/UNKNOWN); `administrator_authority` VERIFIED/NOT_VERIFIED; `mfa_enforcement_coverage` ALL/SOME/NONE/UNKNOWN; `external_user_policy` APPROVED/GAP/UNKNOWN; `evidence_ref` (restricted pointer only); `result` VERIFIED_GAP/VERIFIED_COVERAGE/BLOCKED/NOT_APPLICABLE. **Do not publish** exact tenant IDs, staff email addresses, individual 2SV status or Admin screenshots in GitHub.

**Decision rule:** If centrally enforced MFA for **every** intended private user cannot be shown, option A1 in ADR-AUTH-01 remains **UNPROVEN**, regardless of Google login availability.

## 3. E2 — Apps Script Deployment Metadata (script-operator-owned, read-only)

**Precondition:** a named, existing Apps Script project custodian approves one specific script project **in a restricted environment record**, and a reviewer confirms that API/UI access will return only deployment metadata. This protocol does **not** require reading raw code/manifest/user data, invoking `doGet`, or copying credential-bearing URL strings.

### Preferred operator inspection

- From the **existing script editor**, use **Deploy → Manage deployments** to view deployment type, existing deployment/version and access settings **without pressing Edit/New/Archive/Delete/Deploy**. Validate whether the UI exposes both **Who has access** and **Execute as** in the deployed version; if not, use approved metadata API or mark UNKNOWN.
- If the Apps Script API is **already authorized** for this custodian with `https://www.googleapis.com/auth/script.deployments.readonly`, a custodian may use the documented **GET** `/v1/projects/{scriptId}/deployments` and **GET** `/v1/projects/{scriptId}/deployments/{deploymentId}`. Never put Script ID, OAuth bearer token or raw API responses into a shell history, PR, chat, terminal recording or GitHub logs. Do not grant new OAuth scopes just to satisfy this runbook without separate approval. Refer to Google's [deployments.list](https://developers.google.com/apps-script/api/reference/rest/v1/projects.deployments/list) and [deployments.get](https://developers.google.com/apps-script/api/reference/rest/v1/projects.deployments/get).
- Read only: deployment class, `deploymentConfig.versionNumber`, whether there is a Web App entry point, `entryPoints[].webApp.entryPointConfig.access`, `executeAs`, metadata update time, whether the expected release mapping is consistent, and count of historical deployments (without raw IDs/URLs). Different versions/deployments may use different configuration. **An Apps Script /dev mutable test link is not proof of the deployed /exec version.**
- Enum values in Google's Deployment API: access `MYSELF` / `DOMAIN` / `ANYONE` / `ANYONE_ANONYMOUS`; execute-as `USER_ACCESSING` / `USER_DEPLOYING`. These are **possible values**, not observed Smart SRRT values. Google explains `USER_DEPLOYING` executes with deployer authority, not necessarily the project owner or visiting user. See [REST deployment schema](https://developers.google.com/apps-script/api/reference/rest/v1/projects.deployments) and [Web Apps](https://developers.google.com/apps-script/guides/web).
- E2 excludes **actual** manifest `oauthScopes` enumeration, backing Spreadsheet/Drive permissions, Script Properties content, live app RPC tests and Google actor session tests. Those are E3/E4/RR-02 and need separately scoped human approval. **Never** infer `runtimeVersion` or OAuth scopes from a deployment record alone.

**E2 minimal reviewed output:** `operator_authority` VERIFIED/NOT_VERIFIED; `target_class` EXISTING_PRODUCTION_METADATA/ISOLATED_STAGING_METADATA; `deployment_count_band`; `expected_deployment_present` YES/NO/UNKNOWN; `published_version_band` or restricted vault pointer; `webapp_access` one of the above enums/UNKNOWN; `webapp_execute_as` one enum/UNKNOWN; `multiple_exposed_entrypoints` YES/NO/UNKNOWN; `evidence_ref` restricted pointer; `result` VERIFIED/GAP/BLOCKED. Nothing here grants permission to change the version or manifest.

## 4. Combined decision matrix

| Condition | E1 | E2 | ADR / release disposition |
| --- | --- | --- | --- |
| No authorized admin or deployment metadata mechanism | **BLOCKED** | **BLOCKED** | **H0-B NOT VERIFIED**, keep ADR PROPOSED |
| Managed MFA fully evidenced, deployment unknown | VERIFIED | BLOCKED | Do not choose execute-as or change access settings |
| Deployment `USER_DEPLOYING` with public access | Any | VERIFIED | Need strong server-verified caller identity; do not treat `Session.getEffectiveUser` as visitor |
| Deployment `USER_ACCESSING` | Any | VERIFIED | Each relevant user needs authorized Google scopes and least-privilege Sheets/Drive/Docs access; defer to E3/E4, not a ready toggle |
| Both metadata packets reviewed | VERIFIED | VERIFIED | Can propose Product Owner choice **only**; R01–R08 and all migration gates remain OPEN |

**Stop conditions:** wrong project or custodian; unexpected sensitive data; OAuth consent requesting elevated/write scope; ambiguous live/staging boundary; private URL or password/hash exposed; external access/2SV evidence incomplete; API errors. Stop and record a sanitized `BLOCKED` outcome; do **not** expand permissions or retry with a broader Google account automatically.

## 5. Evidence status at time of authorship

| Case | Current outcome | Explanation |
| --- | --- | --- |
| E1 Workspace 2SV enforcement and coverage | **NOT_RUN / BLOCKED** | No Workspace Admin policy tool or verified administrator |
| E1 cross-agency/personal accounts | **NOT_COLLECTED** | No permitted identity cohort inventory |
| E2 existing Apps Script deployment access/execute-as | **NOT_RUN / BLOCKED** | No Apps Script Deployments connector, verified script target or authorized custodian |
| E2 published version / alternate deployment visibility | **NOT_COLLECTED** | No remote query or editor session |
| GitHub source baseline & docs | **VERIFIED** | `main@da0601ede06ea13ce34d36b8521518e733de4205` |
| Apps Script source/manifest/script properties / Google file ACL | **NOT_READ** | Intentionally outside E1/E2 |
| Authentication implementation / staging / Deployment | **NOT_CHANGED** | Docs-only, `APPS_SCRIPT_DEPLOYMENT=HOLD` |

**Next decision:** Product Owner identifies the operator/custodian and target class via a restricted channel and chooses a permitted E1 and/or E2 read-only method, or explicitly defers H0-B and continues other source-only risk triage. **No auth architecture choice follows automatically from this PR's Merge.**

## 6. Cross references

- [H0-A Source Inventory](h0-authentication-source-inventory-2026-10-12.md)
- [H0-B Original Evidence Request](h0-restricted-operator-evidence-request-2026-10-12.md)
- [ADR-AUTH-01 Proposal](../architecture/adr-auth-01-managed-identity-transition.md)
- [Google Apps Script Deployments API](https://developers.google.com/apps-script/api/reference/rest/v1/projects.deployments)
- [Google Workspace 2SV Rollout/Enforcement](https://support.google.com/a/answer/9176657?hl=en)
