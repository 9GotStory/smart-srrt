# D331 N1-C2B — Offline Native26 Integration Preview (No Registration)

**Issue:** #198 · **Parents:** #178 / #183 · **Source baseline:** `main@2ffbc5c3fa51c78b39893bb2e2382151827e23c5` · **Previous gates:** N1-C1 PR #193, N1-C2A PR #195 merged. Smart SRRT is **Development-only; no Production exists**.

## Result and purpose

This is a **read-only, Source-only, IN-MEMORY** preview of the future 26-file Native Apps Script structure. It is **not** a visible Dengue page, not a release build, not a staged file set, and not proof that a Google Script is bound to the expected Spreadsheet.

The current Native25 remains: 8 server `.gs` + 16 HTML partials + generated `Index.html`. The existing `tools/deploy-g34-clasp.sh` operator script requires the current 25-file staging allowlist and exact 16 HTML includes. **Changing `tools/native-sources.mjs` without updating these checks and their negative tests would break the fail-closed deployment contract.** Therefore this review does not add or register anything in the current manifest.

The *provisional* Native26 model is **8 GS + 17 HTML + Index**, with already-reviewed unregistered `src/web/03l-client-d331-status.html` inserted **between** `03k-client-report-generation.html` and `04-browser-app.html`, preserving the unique last file's `boot()`, `</body>`, and `</html>` tail.

## Added files

- `tools/d331-n1c2b-offline-native26-preview.mjs`: offline Node-only inspector, strict fixed source allowlists and candidate order, references *the current real Source files* but produces **no written files**. Pin current N1-C1 status partial and G1-A foundation to approved Git blob bytes; unexpected changes require re-review. Preserves exactly five current page/nav choices and ensures `showPage()` retains closed-world navigation + existing record/admin guards. Candidate `Index` includes exist in memory for inspection only; no content is printed or staged.
- `tests/d331-n1c2b-offline-native26-preview.test.mjs`: eight offline synthetic checks for current Native25 preservation, determinism, wrong count/order/duplicate/extra sources, tampered feature/placeholder buttons, forged Dengue menu, auth bypass, invalid browser close, I/O failure, and CLI privacy.
- `docs/implementation/d331-n1c2b-offline-native26-preview.md`: this boundary and next gates.

## Human-verifiable local-only invocation

```bash
node tools/d331-n1c2b-offline-native26-preview.mjs
node --test tests/d331-n1c2b-offline-native26-preview.test.mjs
```

On a locally consistent 25-file checkout, the CLI prints only:

```text
D331_N1C2B_OFFLINE_NATIVE26_CANDIDATE=PASS
NATIVE25_MANIFEST=UNCHANGED; D331_FEATURE=OFF
D331_GOOGLE_BINDING=NOT_ATTESTED; D331_STAGE_DEPLOY=HOLD
```

On failure it emits generic `FAIL` / `HOLD` with exit code 2; it never prints Script, Deployment or Spreadsheet IDs, auth tokens, PHI, private filenames, URLs, or raw source.

## Product, Security and Session boundaries

**No visible D331 menu/page is created.** The N1-C1 status prototype remains unregistered, with fixed Thai OFF/AUTH_REQUIRED/POLICY_HOLD/NO_GRANT/LOADING/EMPTY/ERROR states, permanently disabled actions and no RPC. The N1-C2A `showPage()` continues rejecting `dengue` and unknown routes. `D331_G1A_ENABLED=false`. The fact that an HTML partial *could be placed in a future provisional Index* does **not** mean it is exposed to clients now.

Before any real N1-C2C integration, require separately approved:

1. **Server-issued D331 readiness contract and guard**, not inferred from client role, button state, user-supplied AreaID, or generic `view/edit/Admin` permissions. Initially feature/permissions/disease policy must remain DENY; no privileged action is ever enabled just by a DOM status.
2. **Session and logout race fencing:** authentication epoch+token snapshot, reject stale/late responses, invalidate loading leases on logout and token switch, reset page to OFF, revoke any private cached D331 state. No new D331 RPC before clinical security approval.
3. **Native26 release-topology change:** update canonical manifest, generated Index order, source parity/contract tests, Native25→Native26 backup allowlist, strict stage whitelist, rollback evidence, final deployment guard, CI and independent review **together in a separate approved PR**. Avoid editing frozen One-Click artifacts.
4. **Clinical and data Human Gates:** signed exact Dengue disease labels/codes and exclusions, separately controlled revocable `dengue.*` grants, strict active AreaID authority, 39-column MainData / 10-column AreaMaster, PHI minimization, lawful privacy/retention/export and AI-use decisions, D331 physical 7-table schema plus grant backing, conflict/backup/rollback.
5. **Actual Development/Testing binding:** canonical existing Script ID, Deployment ID, and `DATABASE_SPREADSHEET_ID` are stored only in **private Issue #189**, per Product Owner. The user supplied all three IDs, and the candidate Spreadsheet ID + 39/10 headers were checked via Google Sheets metadata, but **actual Script Properties and Deployment parenting still lack independent Apps Script inspection**. No re-request for the same IDs; validate privately when needed.

The current operator-facing `deploy-g34-clasp.sh` and related CI assumptions support only up to Native25; this proposed candidate is **not deployable or authorized to stage**. No Script Properties, Google APIs, `clasp`, patient row reads, database writes, DDL or TEST deploy occurred. No Production installation exists.

**Status:** `N1_C2B_OFFLINE_CANDIDATE=SOURCE_ONLY`; `NATIVE25_REGISTERED_D331_UX=NO`; `D331_FEATURE=OFF`; `N1_C2C_VISIBLE_INTEGRATION=HOLD`; `N1_B2D/DDL/TEST_DEPLOY=HOLD`. PR Merge requires separate Product Owner exact-SHA approval after CI and reviewer checks.
