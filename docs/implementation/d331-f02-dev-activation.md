# F02 synthetic-only Development activation

Date: 30 October 2026. Source baseline: `main@7c6b7618ae45f22b6a6ffa45c76d726dad89d088`.
Status: **source candidate; not deployed or observed in the browser**. Canonical tracker: [Issue #238](https://github.com/9GotStory/smart-srrt/issues/238).

The PO requested enabling F02 in the existing Development environment, confirmed that all Event/health content is synthetic, and approved the eight-path implementation scope and S1–S3. This authorizes pursuing a bounded synthetic DEV exercise; it is not real-patient privacy/clinical approval. Source Merge remains a separate PO gate. Do not ask again whether the settled target is Production or whether the agreed data is synthetic.

## Package and runtime behavior

`tools/d331-f02-dev-package.mjs` reuses the existing in-memory Native33 candidate and adds the actual private Case reader. The separate F02 candidate has **16 GS + 17 HTML partials + Index = 34 source files**. Its private stage has 35 files including the **byte-identical original `appsscript.json`**. Default Native26 and the old Native33 package remain OFF and unchanged; the frozen archives are unchanged.

Only checked activation declarations in G1-A, P0-03B, P0-07, the Case reader and F02 client availability are substituted. The expected workbook, synthetic disease label, synthetic policy revision and candidate Case field allowlist come from a strict private profile. Other staged bytes stay canonical; the reader adds no public server declaration. The v2 schema stays DRAFT_ONLY and clinical SLA stays NOT_EVALUATED.

The profile requires exactly: `version=1`, `environment=DEVELOPMENT_ONLY`, `dataClass=SYNTHETIC_ONLY`, exact `sourceSha`, original `scriptId/deploymentId/spreadsheetId`, numeric `priorVersion`, `diseaseLabels=["SYNTHETIC_DENGUE_ONLY"]`, a `SYNTHETIC_F02_DEV_...` policy revision, and `caseFields=["CaseID","CaseRevision","CaseStatus"]`. No passwords, tokens, health payloads or extra keys are accepted. Keep it outside Git in a user-owned private directory; the owner confirmation supplies the data-class assertion, not the profile parser itself.

Activation does not issue rights: every read/write/status operation still checks current server session/credentials, unique active Event/Area/user, the pinned workbook/headers, synthetic disease/policy and explicit Event/Area-scoped grants. A missing or mismatched Script Property denies access; tooling does not repair it. PENDING, revision, minimal-receipt and unknown-outcome guards remain the merged F02 implementation.

## Private preparation and guarded deployment

Use the existing target inventory in #189; never publish identifiers, account emails, credentials or raw inventories. Preserve original manifest/OAuth/execute/access settings. The old P0-11 read-only preflight must first produce a **fresh** private snapshot at the exact approved source SHA, including archive/checksum, local extraction drill, source and deployment/version inventories. The earlier Version20 backup is historical evidence and cannot be reused across a later source SHA.

The new wrapper `tools/deploy-d331-f02-dev.sh` accepts only `--prepare`, `--verify`, and `--deploy`. It checks the actual tool checkout, clean main/origin/main and exact source SHA. Prepare/verify require the read-only flag; deploy requires the SHA-bound DEV execution flag. The implementation does not add rollback/create-project/create-deployment/delete/login modes.

Set these privately, with actual existing values rather than the placeholders:

```text
SMART_SRRT_APPROVED_SOURCE_SHA=<reviewed and merged exact source SHA>
SMART_SRRT_REPO=<original repository>
SMART_SRRT_SCRIPT_ID=<original Script ID>
SMART_SRRT_DEPLOYMENT_ID=<original deployment ID>
SMART_SRRT_F02_SPREADSHEET_ID=<original synthetic DEV workbook>
SMART_SRRT_F02_PRIOR_VERSION=<exact version of that deployment>
SMART_SRRT_F02_PRIVATE_BACKUP_DIR=<fresh P0-11 snapshot for the same SHA>
SMART_SRRT_F02_PROFILE=<private validated profile JSON>
```

Then, under the corresponding authorization:

```bash
SMART_SRRT_F02_READONLY_APPROVED=YES bash tools/deploy-d331-f02-dev.sh --prepare
SMART_SRRT_F02_READONLY_APPROVED=YES bash tools/deploy-d331-f02-dev.sh --verify
# Set SMART_SRRT_F02_DEV_APPROVED_SHA privately to the exact approved merged SHA.
bash tools/deploy-d331-f02-dev.sh --deploy
```

Prepare creates a new `f02-stage`, profile, exact clasp configuration and hash ledger without altering the old OFF stage. Verification regenerates expected bytes from canonical source/profile and checks the original backup, target/prior version, private ownership/modes, file set, manifest and push order. Existing artifacts or resource conflicts are rejected instead of replaced.

Deploy takes a one-attempt directory lock and records each phase privately. It pulls fresh source and inventories and rejects any drift before push. After whole-project push, it reads the source back and compares bytes; it creates an immutable version, pulls that exact version and compares again. Only then, after another deployment-drift check, does it update the **existing deployment** using explicit `--versionNumber`. Final inventory verification requires the intended version and unchanged other deployments. Raw command output remains in the private attempt directory.

Release operators must serialize changes: the read/check/update sequence is not a remote transaction or a conditional lock against manual/nonparticipating writers. A change inside the final check-to-update window cannot be ruled out by these offline tests.

A failure after a mutation starts is **UNKNOWN / reconcile**, even when the CLI exits nonzero. No blind retry or automatic rollback occurs. Never delete the attempt directory to force a retry; inspect private evidence/current remote state and prepare a newly reviewed action. Repointing a prior immutable deployment, restoring mutable source and restoring data are different actions; the local extraction drill does not prove remote recovery.

The CLI interaction was checked against installed clasp 3.4.1 source and its [versioned official documentation](https://github.com/google/clasp/blob/v3.4.1/README.md): `create-version --json` returns `versionNumber`; `update-deployment --versionNumber` targets an existing deployment. Tooling keeps GitHub source publication distinct from Apps Script writes.

## Synthetic test setup and acceptance

The wrapper changes source/deployment only; it does not provision accounts, grants, Events or Case rows. Prepare a bounded fixture in the existing workbook after checking headers, target, ownership and duplicates. Reuse a suitable explicit test account/Event or add clearly identified synthetic fixtures; do not replace existing resources or borrow credentials. Issue only `dengue.case.read` and `dengue.case.write` for the test Event/Area, synthetic policy revision and an explicit expiry. No five-domain blanket grant. Restricted setup evidence must identify what was added without publishing IDs or secrets.

The server must prove the current Script Property binding through its ordinary fail-closed checks. Then exercise login/Records, empty/read, create, selected-field PATCH/optional clear, receipt/fresh read, stale revision, denied/expired/revoked grant and logout; verify the original Dashboard/Records/report/library smoke paths. Do not induce a real interrupted write merely to test PENDING without a separately bounded reconciliation procedure; interruption behavior is covered offline. No patient data or Gemini call is needed.

S1 tests actual assembled package/profile/private stage. S2 reuses the existing GAS I/O fixture and actual authorization/credential helpers with assembled package source for read/create/PATCH/status and denials. S3 executes the actual shell wrapper against synthetic git/clasp/filesystem I/O, including drift, immutable-version checks, unknown mutation phases and refusal to repeat. Full Native26 tests/contracts/parity remain required.

## Evidence limits and current frontier

Before implementation, a read-only operator check found the original deployment at Version20; source/manifest backup SHA256 and local restore drill passed without cloud mutation or Sheet row reads. This is dated metadata/source evidence, not browser acceptance of the new candidate.

At this source-candidate stage, **F02 DEV deployment and browser exercise are NOT VERIFIED**. Source code, synthetic tests, exact-HEAD CI/review, source Merge, actual deployed version and browser results must be recorded separately in #238. Real-data D2/P1/P2/S1/S2/C1/C2 decisions remain distinct; the synthetic exercise does not close them or start F03–F08.
