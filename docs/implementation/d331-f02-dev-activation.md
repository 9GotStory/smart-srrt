# F02 synthetic-only Development activation

Date: 30 October 2026. Source baseline: `main@7c6b7618ae45f22b6a6ffa45c76d726dad89d088`.
Status: **original synthetic DEV is Version22, deployed from `17975ff3b0a3e863dfcd8e29c3f5a70a0fe13946`; bounded synthetic-only browser UAT PASS on 4 November 2026.** The Version21 FAIL record and the Version21 update procedure below are historical. Canonical tracker: [Issue #238](https://github.com/9GotStory/smart-srrt/issues/238). The same tooling now builds the F03 Plans candidate from the Version22 frontier; see the [F03 Plans round](#f03-plans-round--12-november-2026). It is not deployed.

The PO requested enabling F02 in the existing Development environment, confirmed that all Event/health content is synthetic, and approved the eight-path implementation scope and S1–S3. This authorizes pursuing a bounded synthetic DEV exercise; it is not real-patient privacy/clinical approval. Source Merge remains a separate PO gate. Do not ask again whether the settled target is Production or whether the agreed data is synthetic.

## Package and runtime behavior

`tools/d331-f02-dev-package.mjs` reuses the existing in-memory Native33 candidate and adds the actual private Case reader. The separate F02 candidate has **16 GS + 17 HTML partials + Index = 34 source files**. Its private stage has 35 files including the **byte-identical original `appsscript.json`**. Default Native26 and the old Native33 package remain OFF and unchanged; the frozen archives are unchanged.

Only checked activation declarations in G1-A, P0-03B, P0-07, the Case reader and F02 client availability are substituted. The expected workbook, synthetic disease label, synthetic policy revision and candidate Case field allowlist come from a strict private profile. Other staged bytes stay canonical; the reader adds no public server declaration. The v2 schema stays DRAFT_ONLY and clinical SLA stays NOT_EVALUATED.

The profile requires exactly: `version=1`, `environment=DEVELOPMENT_ONLY`, `dataClass=SYNTHETIC_ONLY`, exact `sourceSha`, original `scriptId/deploymentId/spreadsheetId`, numeric `priorVersion`, `diseaseLabels=["SYNTHETIC_DENGUE_ONLY"]`, a `SYNTHETIC_F02_DEV_...` policy revision, and `caseFields=["CaseID","CaseRevision","CaseStatus"]`. No passwords, tokens, health payloads or extra keys are accepted. Keep it outside Git in a user-owned private directory; the owner confirmation supplies the data-class assertion, not the profile parser itself.

Activation does not issue rights: every read/write/status operation still checks current server session/credentials, unique active Event/Area/user, the pinned workbook/headers, synthetic disease/policy and explicit Event/Area-scoped grants. A missing or mismatched Script Property denies access; tooling does not repair it. PENDING, revision, minimal-receipt and unknown-outcome guards remain the merged F02 implementation.

## Private preparation and guarded deployment

Use the existing target inventory in #189; never publish identifiers, account emails, credentials or raw inventories. Preserve original manifest/OAuth/execute/access settings. The old P0-11 read-only preflight must first produce a **fresh** private snapshot at the exact approved source SHA, including archive/checksum, local extraction drill, source and deployment/version inventories. The earlier Version20 backup is historical evidence and cannot be reused across a later source SHA.

The new wrapper `tools/deploy-d331-f02-dev.sh` accepts `--snapshot`, `--prepare`, `--verify`, and `--deploy`. It requires the tested clasp 3.4.1, actual tool checkout, clean main/origin/main and exact source SHA. Snapshot/prepare/verify require the read-only flag; deploy requires the SHA-bound DEV execution flag. The implementation does not add rollback/create-project/create-deployment/delete/login modes.

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

Prepare creates a new `f02-stage`, profile, exact clasp configuration and hash ledger without altering the old OFF stage. Verification regenerates expected bytes from canonical source/profile and checks the original backup, target/prior version, private ownership/modes, file set, manifest and push order. It validates the consumed remote clasp config (exact Script ID, rootDir `.`, `.gs/.html` extensions and allowed keys), and compares every archived regular-file member to the current backup bytes using tar-to-stdout without extracting paths. A checksum alone is not treated as proof that the current backup still matches its archive. Existing artifacts or resource conflicts are rejected instead of replaced.

Deploy takes a one-attempt directory lock and records each phase privately. It pulls fresh source and inventories and rejects any drift before push. Every cloud command pins explicit project and a generated/verified empty private ignore file, overriding ambient configuration. Before any push, actual clasp `show-file-status --json` must select exactly the 35 physical stage files. After whole-project push, it reads the source back and compares bytes; it creates an immutable version, pulls that exact version and compares again. Only then, after another deployment-drift check, does it update the **existing deployment** using explicit `--versionNumber`. Final inventory verification requires the intended version and unchanged other deployments. Raw command output remains in the private attempt directory.

Release operators must serialize changes: the read/check/update sequence is not a remote transaction or a conditional lock against manual/nonparticipating writers. A change inside the final check-to-update window cannot be ruled out by these offline tests.

A failure after a mutation starts is **UNKNOWN / reconcile**, even when the CLI exits nonzero. No blind retry or automatic rollback occurs. Never delete the attempt directory to force a retry; inspect private evidence/current remote state and prepare a newly reviewed action. Repointing a prior immutable deployment, restoring mutable source and restoring data are different actions; the local extraction drill does not prove remote recovery.

The CLI interaction was checked against installed clasp 3.4.1 source and its [versioned official documentation](https://github.com/google/clasp/blob/v3.4.1/README.md): `create-version --json` returns `versionNumber`; `update-deployment --versionNumber` targets an existing deployment. Tooling keeps GitHub source publication distinct from Apps Script writes.

## Synthetic test setup and acceptance

The wrapper changes source/deployment only; it does not provision accounts, grants, Events or Case rows. Prepare a bounded fixture in the existing workbook after checking headers, target, ownership and duplicates. Reuse a suitable explicit test account/Event or add clearly identified synthetic fixtures; do not replace existing resources or borrow credentials. Issue only `dengue.case.read` and `dengue.case.write` for the test Event/Area, synthetic policy revision and an explicit expiry. No five-domain blanket grant. Restricted setup evidence must identify what was added without publishing IDs or secrets.

Use an Admin test account for Records: existing RBAC excludes Staff, and D331 grants do not alter that role policy. The server must prove the current Script Property binding through its ordinary fail-closed checks. Then exercise login/Records, empty/read, create, selected-field PATCH/optional clear, receipt/fresh read, stale revision, denied/expired/revoked grant and logout; verify the original Dashboard/Records/report/library smoke paths. Do not induce a real interrupted write merely to test PENDING without a separately bounded reconciliation procedure; interruption behavior is covered offline. No patient data or Gemini call is needed.

S1 tests actual assembled package/profile/private stage. S2 reuses the existing GAS I/O fixture and actual authorization/credential helpers with assembled package source for read/create/PATCH/status and denials. S3 executes the actual shell wrapper against synthetic git/clasp/filesystem I/O, including drift, unsafe copied config, inherited ignore/project overrides, actual selected-file omission, immutable-version checks, unknown mutation phases and refusal to repeat. Full Native26 tests/contracts/parity remain required.

## Evidence limits and current frontier

Before implementation, a read-only operator check found the original deployment at Version20; source/manifest backup SHA256 and local restore drill passed without cloud mutation or Sheet row reads. This is dated metadata/source evidence, not browser acceptance of the new candidate.

The initial release completed the original Version20 → Version21 update with pushed/immutable source and deployment inventory readbacks. Playwright CLI 0.1.22/Chrome verified login, the pinned runtime binding, an empty Case list and one UI create at Revision1/COMMITTED. Fresh list then failed because Sheets stored the onset date as a DATE cell while the logical validator requires a string. Two read-only browser RPC probes reproduced this while the same session confirmed COMMITTED. Dashboard/Records/report/library navigation and logout/old-token denial passed. No PATCH, duplicate create, PENDING, manual row rewrite, Gemini call or rollback followed. **Version21 UAT is FAIL**, with redacted receipts in #238. The date repair was later deployed and retested as Version22; see the [Version22 result](#version22-synthetic-dev-result--4-november-2026). Real-data D2/P1/P2/S1/S2/C1/C2 decisions remain distinct; the synthetic exercise does not close them or start F03–F08.


## Approved date round-trip repair and active-package backup

The PO approved ten source/test/tool/doc paths and S1–S3 after the Version21 finding. An internal Case storage decoder is shared by authorized reader detail reads and guarded writer Case snapshots. Only a valid service Date in OnsetLocalDate is decoded to `yyyy-MM-dd` using the pinned parent workbook's time zone. Canonical strings/optional empty remain unchanged; numeric serials, invalid dates, wrong parent or absent time zone deny. Other fields and the pure logical schema stay strict. Decoding copies rows and performs no write: the existing committed date can be read and PATCHed without a data repair or schema migration. Actual package tests model date conversion after appendRow/setValues, omitted PATCH fields, UTC day boundaries and denials.

The legacy P0-11 snapshot applies to the initial OFF Native33 activation. For the then-active **Version21** (this update is complete; see the [Version22 result](#version22-synthetic-dev-result--4-november-2026)), use the new read-only `--snapshot` mode in a new, empty, private directory. Set `SMART_SRRT_F02_PREVIOUS_WORK` to the retained successful Version21 release workspace; use a new input profile with `priorVersion=21` and the newly reviewed/merged source SHA. This frontier is deliberately bounded to previous source `6257851296e949e88777c4a8e86aa83c9d22a399` (its profile has priorVersion20). A different prior release requires another reviewed frontier. P0-11/P0-13 validators are unchanged.

Before any cloud read, the previous profile/targets, successful state, created Version21, deployment receipt, sealed stage and original manifest must reconcile. The tool reconstructs all 34 previous source files from that exact local Git object using the unchanged native compiler/manifest/vendor contract; it never executes backup code. That Git object and pinned dependencies must be available locally. It then pulls mutable source and immutable Version21 with explicit project/ignore flags, compares both to the reconstructed package and original manifest, and verifies deployment/version inventories before and after. The source-bound archive contains both copies and prior profile/manifest/seal; checksum and every archived member's restored bytes are verified without extracting paths. Drift, reuse or unsafe/mismatched evidence fails before any push.

```bash
# Existing target values, previous successful workspace, new empty backup directory,
# candidate input profile and exact approved merged source SHA are set privately.
SMART_SRRT_F02_READONLY_APPROVED=YES bash tools/deploy-d331-f02-dev.sh --snapshot
SMART_SRRT_F02_READONLY_APPROVED=YES bash tools/deploy-d331-f02-dev.sh --prepare
SMART_SRRT_F02_READONLY_APPROVED=YES bash tools/deploy-d331-f02-dev.sh --verify
# Existing separately authorized synthetic DEV intent; SHA-bound flag set privately.
bash tools/deploy-d331-f02-dev.sh --deploy
```

The bounded Playwright retest, completed as recorded below, followed exact-HEAD review/CI, separate PO source Merge, post-merge CI and fresh backup/update. First read the existing committed synthetic Case, then selected-field PATCH/fresh revision/receipt and negative permission/revision/logout checks. Do not work around the failure with duplicate creates or manual row edits. Record browser UI versus browser-invoked RPC checks separately; clinical policy remains NOT_EVALUATED.

## Version22 synthetic DEV result — 4 November 2026

[#268](https://github.com/9GotStory/smart-srrt/pull/268) merged at `17975ff3b0a3e863dfcd8e29c3f5a70a0fe13946` with post-merge [CI #41017985940](https://github.com/9GotStory/smart-srrt/actions/runs/41017985940) SUCCESS. After a fresh active-package backup, the guarded one-attempt release updated the original deployment from Version21 to Version22, with pushed and immutable byte readbacks and a passing final inventory.

**Browser UI (Playwright CLI 0.1.22/Chrome), observed PASS:** login; read of the existing committed Case at Revision1 without rewriting its row; one selected-field PATCH to Revision2; one confirmed optional clear to Revision3; fresh lists. Dashboard/Records/report/library navigation and the Logout button with old-session denial passed; no Gemini generation ran.

**Browser-invoked backend negatives:** stale Case/Event revisions and expired/revoked grants were denied with no ledger row; the UI then cleared its private list and hid write controls.

Final data: one synthetic Case at CaseRevision3, three COMMITTED ledger requests, zero PENDING. The final grant state in the receipt is ACTIVE at revision 4, with expiry 2026-11-05T07:32:41Z (14:32:41 +07:00); no later state was observed. The full redacted receipt is at the top of [#238](https://github.com/9GotStory/smart-srrt/issues/238). F03 is not part of this package, and real-data and clinical decisions remain HOLD.

## F03 Plans round — 12 November 2026

Status: **source and offline tests only**, under [Issue #273](https://github.com/9GotStory/smart-srrt/issues/273). DEV still runs Version22 (F02 only). The sections above describe the F02 rounds. Where they give 34 source files, 35 staged files or the `6257851` frontier, this section replaces them for current source.

The PO approved the plan, its four change areas and test seams S1–S3 on 12 November 2026. After Merge, four separate PO approvals are needed, in this order: a read-only backup of the live Version22, the deploy, synthetic accounts and grants in the DEV workbook, then the Playwright Browser UAT. A merged PR or green CI authorizes none of them. If the agent's permission checks block the deploy or a workbook write, the operator runs the prepared commands.

### Package

The builder appends the F03 Plan workflow (`src/dengue/16-f03-plan-workflow.gs`) after the Case reader in server push order. The candidate has **17 GS + 17 HTML partials + Index = 35 source files**, all 17 GS files in push order. The private stage holds 36 files, including the byte-identical original `appsscript.json`. Every F02 substitution stays. Three more declarations switch on in this package only. Each is an exact one-occurrence substitution that fails closed:

| File | Declarations switched on |
| --- | --- |
| `16-f03-plan-workflow.gs` | `D331_F03_ENABLED_`, `D331_F03_SCOPE_APPROVED_` |
| `03h-client-event-records.html` | `D331_F03_PLANS_AVAILABLE_` |

The package adds no public server declaration. The four Plan RPCs (`listDenguePlansForEvent`, `listAssignableDenguePlanOwners`, `saveDenguePlan`, `getDenguePlanWriteStatus`) already exist in canonical core and fail closed while F03 is absent or OFF. Canonical Native26 and Native33 keep F03 OFF and unregistered. Prepare reports `SOURCE_FILES=35`, and clasp must select all 36 staged files before push.

### Prior release frontier

The snapshot accepts exactly one previous release: source `17975ff3b0a3e863dfcd8e29c3f5a70a0fe13946`, whose profile has `priorVersion=21` and whose release created and deployed Version22. The candidate profile must have `priorVersion=22`. The older `6257851296e949e88777c4a8e86aa83c9d22a399` (Version21) frontier is no longer accepted. The tool rebuilds Version22 from that local Git object with the F02-only activation (34 files, 16 in push order), kept apart from the candidate activation. It keeps the native compiler and vendor drift check; those tool files are unchanged between `17975ff` and the baseline.

The candidate profile keeps the same keys and synthetic-only constraints. Its target, workbook, disease label, Case fields and policy revision must equal the Version22 profile; only `sourceSha` and `priorVersion` change. Each of these stops the snapshot before any cloud read: another previous SHA, a previous prior version other than 21, a candidate prior version other than 22, a change to any of those values, or a missing, altered or unverified Version22 release workspace, unless the operator opts in to live re-attestation (below).

Use only this active Version22 snapshot as the baseline for the F03 candidate. The older P0-11 snapshot path still exists for an OFF Native24–Native33 deployment, but it is not a valid baseline for this round. The tool checks the Version22 frontier only on the active snapshot path, so it does not enforce this.

The wrapper is unchanged. Set the private values as before, with `SMART_SRRT_F02_PREVIOUS_WORK` pointing at the retained Version22 release workspace, a new empty backup directory, the candidate input profile, `SMART_SRRT_F02_PRIOR_VERSION=22` and the exact merged SHA. Then run each step under its approval:

```bash
# Backup approval: read-only snapshot of the live Version22.
SMART_SRRT_F02_READONLY_APPROVED=YES bash tools/deploy-d331-f02-dev.sh --snapshot
# Private local stage; no Apps Script access.
SMART_SRRT_F02_READONLY_APPROVED=YES bash tools/deploy-d331-f02-dev.sh --prepare
SMART_SRRT_F02_READONLY_APPROVED=YES bash tools/deploy-d331-f02-dev.sh --verify
# Deploy approval; SMART_SRRT_F02_DEV_APPROVED_SHA set privately.
bash tools/deploy-d331-f02-dev.sh --deploy
```

Deploy moves only the existing DEV deployment to the next immutable version, expected to be Version23, so the URL stays the same. The version and deployment descriptions still read "F02 synthetic DEV" plus the source SHA; the SHA identifies the content. An uncertain push, version or update stops for manual reconciliation without retry or rollback. Version22 stays immutable and backed up. Pointing the deployment back to it is a manual operator action that needs its own PO approval.

The backup directory becomes the Version23 release workspace, and the next round needs it as evidence. Keep it in a persistent private location, such as a dated folder under `~/.local/share/smart-srrt/`. Never use `/tmp`: on the operator machine it is tmpfs and is cleared at reboot.

### If the Version22 release workspace is lost

The Version22 workspace from 4 November 2026 was lost, and #273's amendment of 12 November 2026 adds live re-attestation for that case. Use it only when the workspace is lost. Opt in with `SMART_SRRT_F02_PREVIOUS_EVIDENCE=LIVE_REATTESTATION`, and leave `SMART_SRRT_F02_PREVIOUS_WORK` unset. Opting in while a workspace is set, or with any other value, stops before any cloud read. Every other setting is the same as above:

```bash
# Backup approval: read-only re-attestation of the live Version22.
SMART_SRRT_F02_PREVIOUS_EVIDENCE=LIVE_REATTESTATION SMART_SRRT_F02_READONLY_APPROVED=YES \
 bash tools/deploy-d331-f02-dev.sh --snapshot
```

Before any cloud read, the tool requires an empty backup directory and a candidate profile with `priorVersion=22`. It derives the Version22 profile from that candidate: source `17975ff`, `priorVersion=21`, and every other value unchanged. The script ID and deployment ID are in the operator's private P0-11 backups. The workbook ID and the Version22 policy revision come from #189.

After the usual read-only pulls, and before writing any evidence, these must all hold:

- The live source and the immutable Version22 equal, byte for byte, the F02-only rebuild of `17975ff` from the local Git object. The workbook ID and policy revision are embedded in those bytes, so a wrong value fails here. A wrong disease label or Case fields is refused earlier, when the profile is checked.
- Both copies carry the same V8 manifest.
- The deployment is at Version22, and the inventories do not change between reads.

Any mismatch stops with no evidence, archive or later step. On success, the output says `PREVIOUS_EVIDENCE=LIVE_REATTESTATION`, and the archived seal records `"evidence":"LIVE_REATTESTATION"`. Prepare, verify and deploy then run as above. The receipt must say that the baseline was re-attested from the live deployment against Git, not taken from the 4 November record. That release run itself is no longer verifiable.

### Accounts and grants

This operator step sits outside the tooling, which issues no grants, accounts or rows. After the deploy, under its own approval:

- Reuse the existing synthetic Event, Area and Case. Add no Event or Case.
- Check that the `DenguePlans` sheet exists with the exact v2 headers. If it does not, stop: workbook changes need their own approval.
- Give each tester `dengue.case.read`, `dengue.plan.read` and `dengue.plan.write` for that Event/Area, with the Version22 synthetic policy revision and an explicit expiry 24 hours after issue. Give no Case write and no other D331 capability. The Version22 Case grants expired on 5 November 2026, so fresh grants are needed.
- Keep the existing synthetic Admin unchanged as the Plan creator. Assignment needs core `assign`, so add one clearly identified synthetic Manager account (PO decision, 12 November 2026).
- Record whether an active user without Plan grants exists for the assignee absence check.

### Browser UAT checklist

Run with Playwright CLI and Chrome after the UAT approval. The PO types passwords into the Playwright browser window, never into chat or logs.

1. Log in as the Admin tester → Records → the existing synthetic Event and Case → Plans shows the empty state.
2. Create Plan A with an ordinary key. Fresh read: OPEN, Revision 1, responsible user = creator.
3. Create Plan B (`2026-11-08`) and Plan C (`12345`). Fresh read shows both keys exactly as typed.
4. Create Plan D with an ordinary key. Fresh read lists A–D.
5. Cancel a create form. No new Plan appears.
6. Close A, reopen A, void D. Fresh reads show A go CLOSED then OPEN, and D VOID with no further actions; revisions rise.
7. Log in as the Manager tester. The assignee list for A shows only eligible users; an active user without Plan grants is absent (Not Verified if DEV has no such user).
8. Reassign A to an eligible user. Fresh read shows the new responsible user.
9. Dashboard, Records, report and library navigation work, and no Gemini generation runs.
10. Log out. Old-session requests are refused.

Record these browser-invoked backend checks separately: a duplicate EpisodeKey (C's key, and D's key on a VOID Plan), a stale Plan revision, and a request after the operator expires or revokes one Plan grant. Each must be refused and add no ledger row. Data result: the ledger rows added during the UAT equal the successful Plan writes (8 in this sequence), all COMMITTED, with no PENDING.

Any failure stops with a report. Do not retry, roll back or edit rows by hand; the fix goes through a new PR. DEV does not exercise `SYSTEM_STATUS` closure, induced interrupted writes or voiding the shared Case; offline tests cover them.

### Evidence and limits

The [activation tests](../../tests/d331-f02-dev-activation.test.mjs) hold the offline evidence at test seams S1–S3, which are not the S1/S2 policy gates:

- **S1** checks the actual package, profile, stage and frontier.
- **S2** loads the prepared stage's server files in push order with synthetic Google services and calls the four Plan RPCs. It models Sheets turning date-like and numeric text into values.
- **S3** runs the actual wrapper with synthetic git, clasp and filesystem, from a Version22 fixture to the Version23 update. It does this with the stored workspace and with live re-attestation, and it includes re-attestation refusals that write no evidence.

EpisodeKey text storage on real Sheets, F03 deployed behavior and Observed in Deployed UI stay **Not Verified** until an operator receipt exists. The redacted receipt goes on #273, separates Browser UI from browser-invoked backend checks and names tool versions. Restricted identifiers stay in #189. Real data, F04–F08, the D2/P1/P2/S1/S2/C1/C2 policy gates and clinical assessment (`NOT_EVALUATED`) are out of scope.
