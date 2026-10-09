# G-32 V8 / main — isolated GitHub integration preflight

Date: 2026-10-09 (Asia/Bangkok)  
State: **INTEGRATION NOT YET PERFORMED — MERGE GATE HOLD**

## Scope and pinned authority

This file records a **read-only integration assessment** and the baseline for later
conflict resolution. The integration branch originated at the then-current `main`
commit. **Creating this file does not bring feature source code into main or into
the integration branch.**

| Role | Ref / authority | Pin |
|---|---|---|
| Base at preflight | `main` | `043ddeffcc7f937e967ade4a6078101b0f544f96` |
| Isolated work branch | `integration/g32-v8-main-preflight-20261009` | initially pinned to base commit |
| Accepted staging V8 code | G-32 Draft PR #60, `feat/g32-report-background-cancel` | `e1f3c920b2bde3497f0850f188fe1bd025929731` |
| G-31 dependency | Draft PR #58 | `5ff4c8e2a23d0f84ebe45954f5f47fa8abe62cc5` |
| G-30 dependency | Draft PR #54 | `71717b14a0b678b922e3fe660dc496a351fc15e3` |

G-32 V8 test-only Apps Script deployment was confirmed by the owner. The positive
end-to-end UAT produced one six-section Google Doc, a matching ReportRegistry
entry and a matching GENERATE_REPORT audit. The owner explicitly accepted the
generated **mock** document; Issue #63 was closed as completed. V8's HTTP-503
retry branch was mock-tested but **not** exercised during the successful live
generation (both section calls returned HTTP 200 on first attempt).

Verified V8 CI: https://github.com/9GotStory/smart-srrt/actions/runs/37880517289
(197/197 regression tests PASS; deterministic One-Click parity PASS;
offline `codeGate=PASS`, `releaseDecision=HOLD`).

## Branch topology: two distinct historical feature lanes

**G-chain: 16 stacked Draft PRs**, in dependency order:

`#24 G-22 → #26 G-23 → #28 G-03 → #30 G-04 → #32 G-05 →
#34 G-19 → #36 G-11 → #38 G-21 → #40 G-24 → #42 G-29 →
#44 G-17 → #50 G-26 → #52 G-27 → #54 G-30 → #58 G-31 → #60 G-32`

Separate **P-chain: 5 stacked Draft PRs**, not an ancestor of the G-chain:

`#7 P2 → #9 P3 → #11 P4 → #13 P5 → #17 P6`

Do **not** merge both lanes blindly or assume 21 PRs form a single queue.
Do not close, rebase, retarget or force-push existing feature PRs as part of this
preflight without a separate review.

## Confirmed divergence and conflict-risk matrix

GitHub compare `main...feat/g32-report-background-cancel` at assessment:
**diverged**, G-32 side **180 commits ahead**, **4 behind**;
merge base `96bf16ff7c5c0ccfb3bc7e1654826a839c77700d`.
These counts describe ancestry, not a count of conflicts.

The four commits unique to `main` include P1–P4 governance/workflow
changes. The latest main P4 commit `043ddeff` specifically introduces
private Event attachments, AuditArchive, limited MasterData CRUD, and
VisitLogs semantic migration. The G-chain has distinct, overlapping G-11,
G-21, G-24 and G-29 implementations. **Feature equivalence and data/schema
semantics must be reviewed independently; conflict markers alone cannot
identify silent regressions.**

| Overlap | `main` evidence | G-chain evidence | Gate before combining |
|---|---|---|---|
| One-Click backend | `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs` changed in main P1–P4 | V8 compiled `Code.gs` changed through G-32 | reconcile modular source first; rebuild One-Click from modules; do not copy one side blindly |
| Browser UI | `Index_Smart_SRRT_OneClick.html` changed in main P1–P4 | G-32 background-job, cancellation and action-state UI | compare both user workflows; preserve auth/accessibility and runtime callbacks |
| Attachments + privacy | main P4 supports private Event attachments | G-11 + G-22 | verify ownership/access policy, download guards and storage metadata |
| Audit + retention | main P4 AuditArchive behavior | G-21 + G-17 report Audit | compare schema floor, archive identity, idempotency and audit writes |
| MasterData governance | main P4 limited CRUD | G-24 | permission matrix, validation and safe authorization |
| VisitLogs semantics | main P4 migration | G-29 | avoid duplicate migrations and preserve existing staging data |
| Runtime config and test policy | main `package.json`, `.github/workflows/tests.yml`, P1–P4 tests | G-30 deterministic build/check/preflight and G-31/G-32 tests | maintain the full union of required tests and release gates |

Observed file-level source pins:
- main `Code.gs` blob `8a1ee478e17e2fc33a948aa5243d61b2ba82c25a`;
  main `Index.html` blob `8eaa2d0d3fff482006807386636abe45899cc515`.
- accepted V8 `Code.gs` blob `8e369a7d03d72aeb1db8ffa72efb009ed6a44c8c`;
  V8 `Index.html` blob `370bbb0567777ccdda2369a23c9e35e65245195c`.
- main workflow only runs push for main/feat/fix/chore branches and pull requests.
  Merely pushing `integration/**` does **not** assure CI. A later **Draft
  integration PR** will be needed for PR-triggered full CI checks once code
  integration is ready for review.

## Ordered execution plan, each gate independently verifiable

1. **Freeze bases** — re-fetch the current remote `main` and all PR head SHAs;
   stop if any ref moved, and update this plan before cherry-picking or merging.
2. **Reconcile overlap before merging** — compare P1–P4 and G-22/G-11/G-21/
   G-24/G-29 behaviors and schemas; explicitly decide which contracts are
   authoritative, especially around privileged data and migrations.
3. **Rehearse only on the isolated branch** — execute a local isolated
   three-way merge into this branch or carefully scoped changes. Record
   conflicts and decisions. Keep all original PRs and staging deployment
   untouched. A clean Git merge alone is **not** acceptance.
4. **Preserve canonical modular build** — reconcile `src/server/*`,
   `src/web/*`, package scripts, and workflow. Run `npm run build` and
   `npm run build:check`; verify that both One-Click artifacts match
   the modular sources byte-for-byte.
5. **Test contracts before human review** — Node full suite; P1–P4
   auth/privacy/governance, G-chain regression tests, G-30 release
   parity, G-31 pinned model, G-32 job ownership/terminal semantics/503-only
   bounded retry/no duplicate reports; offline release preflight.
   No real Gemini calls and no Apps Script installer/migration as part
   of automated integration.
6. **Independent review** — produce source diff, conflict-resolution matrix,
   explicit feature preservation evidence and a Draft integration PR to
   `main` for CI/review. Treat any missing live platform or deployment
   verification as an open gate, not implicit PASS.
7. **Human approval for merge** — no merge of this branch, #60, #58,
   ancestor feature PRs or the P-chain until specifically authorized.
   Production promotion, migrations, Google Sheets changes and templates
   require **separate** approval.

## Explicit stop conditions

- `main` or pinned G-32 V8 source changed unexpectedly.
- Any merge resolution replaces or drops P1–P4 privacy/schema contracts
  without a documented decision.
- Deterministic source-to-One-Click parity fails.
- Auth/accessibility, idempotency, ReportRegistry/Audit or data-migration
  tests regress.
- An integration step requires Google Workspace mutation, another Gemini
  request, production deployment, or merging an unreviewed PR.

**Current state:** Only a new isolated branch and this governance/preflight
document exist. **No application source integration yet; no claim of
integration CI PASS.** Staging V8 acceptance remains valid and independent.
