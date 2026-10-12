# UX-R2-M01-01 — Shared Core / Authentication Native Partials

**Status:** unmerged implementation candidate; source-only, not deployed.
**Base:** main@6c48a048772822ccbbe55ddd5fbd72520efa9409, after M01-00 PR #88.
**Review method:** ChatGPT Technical Review (author-assisted; not independent).
**Merge:** requires separate Product Owner approval. **Apps Script @10 deployment:** not authorized.

## Scope and invariant

This first runtime extraction only moves the existing leading JavaScript sections, without rewriting their logic:
- `03b-client-core.html`: the existing Google Charts loader call, session state, 26 field descriptors, setting descriptors, shared DOM/RPC/toast/modal/sidebar helpers, HTML escaping/unique value helpers, investigation criteria and role UI guards.
- `03c-client-auth.html`: existing navigation/theme functions, `boot()` definition, auth panel, login/logout/registration. `boot()` remains invoked **once** at the end of `04-browser-app.html`, after all partials are loaded.
- `04-browser-app.html`: keeps Dashboard/Event/Reporter/Admin logic, event history and job states, export, duplicate `fileToBase64` declarations and the final `</body></html>` tags unchanged except removal of extracted leading declarations. The deliberate pre-existing duplicate is **not** resolved in this phase.

Order in `tools/native-sources.mjs`: head → CSS → layout → modals → mobile → core → auth → browser/bootstrap. All new JS is classic inline JavaScript in the same document global lexical realm. No `type=module`, dynamic import, new framework, or live network action is added.

## Release staging

Native stage now has **16 files** = 7 GS + 8 HTML partials + 1 generated Index. `dist/apps-script/` stays untracked and is created by the existing Native builder. The exact filenames in operator-only `deploy-g34-clasp.sh` are updated as a static allowlist but the script is **never executed** by this PR. The real manifest, Apps Script OAuth scopes, script/deployment IDs and production code remain outside this development exercise. Frozen One-Click archives retain their historical Git blob identities.

## Test migration and anti-regression protections

- `tests/helpers/native-current.mjs` now obtains the historical `nativeBrowser` **test compatibility view** by concatenating canonical core/auth/browser inline script bodies from `readOrderedClientScripts()`. It is not a generated output for deployment; the actual Native HTML document retains separate script tags and include ordering.
- Dashboard/privacy and UX component tests that previously read only `04-browser-app.html` use the ordered Native client source. The UI staging assertion checks each canonical partial, not an imagined One-Click assembly.
- Native Stage/Index/byte parity gates G-30, G-34, P6, the dashboard-mobile test and operator-only staged-file allowlist reflect 16 files. `native-release-inspection.mjs` explicitly checks the new include order.
- M01 characterized VM tests inspect the three modules and global lexical state (logged out), exact handler names, single late `boot()`, and the unchanged duplicate helper. Existing G-26/G-32/G-33 job, race, focus, unknown-state, and single-action tests remain part of the full regression suite.
- CI passing verifies only source, synthetic browser VM, contracts, release stage parity and tests—not deployed HTML Service or real Browser UAT.

## Verification

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check:ui-assets
npm run build:gas-multifile
npm run build:check
npm run check:gas-multifile
npm run check:contracts
npm run release:preflight
npm test
```

P6 `codeGate=PASS` does **not** authorize release; `releaseDecision=HOLD` remains binding. No change to server `*.gs`, database schema v7, EventID/Revision, 26 field definitions, RBAC, aggregate-only public boundary, AI ReportRegistry, Gemini generation or job state. No `clasp push`, installer, migration, Google Workspace mutation, or production deployment.

**Next phase only after separate merge review/approval:** extract more dashboard/event code incrementally. Reporter is deliberately deferred until its shared-state contract is covered module-by-module.
