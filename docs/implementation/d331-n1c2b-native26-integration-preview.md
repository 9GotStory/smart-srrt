# D331 N1-C2B — Native26 UX Integration Preview (Offline, No Activation)

**Issue:** #196 · **Parents:** #178/#183; N1-C1 #192 and N1-C2A #194 complete · **Exact baseline:** `main@2ffbc5c3fa51c78b39893bb2e2382151827e23c5`

## Engineering decision

Smart SRRT currently builds **Native25**: eight existing `.gs` modules, 16 HTML fragments and one generated `Index.html`. `tools/native-sources.mjs`, G34 tests and the guarded operator script `tools/deploy-g34-clasp.sh` explicitly enforce the Native25 file set, backup and stage allowlists. Inserting the N1-C1 `03l-client-d331-status.html` fragment into the real manifest would produce **Native26**, causing the current deployment guard to reject an unreviewed stage and requiring a separate approved migration of Native topology and testing.

Rather than quietly break this guard or expose a Dengue menu before signed clinical/grant policies, the N1-C2B candidate creates **only an in-memory Native26 integration preview**. It is **not** the running Smart SRRT app.

## Exactly what is previewed

`tools/d331-n1c2b-native26-preview.mjs` reads canonical native sources through the existing build tooling and validates their exact closed-world Native25 baseline. It creates an **isolated Map copy** of the 25 entries and constructs 26 preview entries in memory, without generating any files:

1. In a **copy** of `02-app-layout.html`, insert a single `page-dengue` section before the `</main>` tag, marked **`hidden inert aria-hidden=true`**. This root is not in actual source or the deployed UI; no sidebar menu, `data-page=dengue`, form or patient data is introduced.
2. Insert the existing **N1-C1** `03l-client-d331-status.html` between the Reporter script fragment and the terminal `04-browser-app.html` in an **in-memory Index template only**. This ensures the HTML is before `</body></html>` and the App's terminal `boot();`. The status component still does not auto-mount and its two buttons are always disabled.
3. Keep existing eight GAS `.gs` bytes, all 16 original HTML bytes except the synthetic layout, and the original (real) Native25 generated Index unchanged.
4. Fail closed if the repo's canonical source changes, existing feature flag is not literally `false`, the five-page sidebar/section list drifts, `showPage` is no longer closed-world, or final ordering/index, hidden inert section or OFF-only status controls drift.

The two pure functions `buildD331Native26Preview()` and `verifyD331Native26Preview()` do not call Google, `clasp`, subprocesses or any network API, do not access Spreadsheet data, and never write files. Running the CLI prints **status-only** output:

```text
D331_N1C2B_NATIVE26_PREVIEW=PASS
D331_NATIVE25_MANIFEST=UNCHANGED; PREVIEW=IN_MEMORY_ONLY
D331_FEATURE=OFF; D331_RUNTIME=HOLD; DEPLOY=HOLD
```

This PASS is **structural offline preview validation**, not proof that the real Apps Script runtime renders or authorizes a D331 page. The actual `showPage('dengue')` remains deliberately denied even if a hidden DOM element is hypothetically present.

## Tests and review gates

`tests/d331-n1c2b-native26-preview.test.mjs` verifies synthetic 26-file shape (8 GS, 17 HTML, Index), exact HTML include order/boot boundary, immutable original source, hidden/inert D331 root, no sidebar route, disabled OFF-only status renderer, rejection by actual `showPage` code, adversarial modified index/partial/section/feature flag, no external calls or write APIs. Contract and entire Native regression suite must still pass at exact PR SHA.

No existing files are modified in this PR; exactly **three new files** are added (preview tool, tests and this doc). No Native25 manifest change, no real `Index.html` regeneration, no stage/backup/deployment allowlist changes, no Source registration, no Apps Script Script Properties, no live DB, no patient rows, no physical seven-table DDL, no RPC, no D331 grant or clinical-policy approvals. **Production does not exist**; canonical existing Development/Testing IDs remain in **private Issue #189 only**, never copied to source or PR.

## Specific next gates (each separate approval)

**N1-C2C — Actual Native26 registration and hidden-only route, SOURCE+CONTRACT GATE:** require explicit approval of exactly changed `tools/native-sources.mjs`, Native26 deployment guard/backup/stage allowlists, Index ordering, original five-page behavior tests, server readiness **disabled by default**, logout/session invalidation. Never make the sidebar visible or enable any data action merely because the HTML is included. The current `showPage` five-route allowlist must remain deny until explicit, independently reviewed server capability.

**N1-B2D — Trusted data/clinical/authorization gate:** `DATABASE_SPREADSHEET_ID` source and identity need independent attestation (owner-supplied IDs in #189 are not a Google API proof); exact approved Dengue disease codes/labels and exclusions, revocable user grants, strict AreaID binding, privacy/PHI/retention/consent and data DTO design. Existing generic roles do NOT imply D331 capabilities.

**N1-D/E/F — Physical schema / Development & Testing rollout:** separately approve final D331 tables, conflict-safe additive migrations, backup/rollback, patient-data protection, and guarded existing deployment. No deployment or production action follows simply from source Merge.

**Current gates:** `N1_C2B_NATIVE26_PREVIEW=SOURCE_ONLY`, `NATIVE25_REGISTERED_D331=NO`, `D331_G1A_ENABLED=false`, `B2D/DDL/TEST_DEPLOY=HOLD`, `PRODUCTION=NOT_CONFIGURED`. Merge requires **separate Product Owner approval** after exact-SHA CI and review.