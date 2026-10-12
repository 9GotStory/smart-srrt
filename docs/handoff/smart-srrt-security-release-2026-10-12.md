# HANDOFF — Smart SRRT / Security Release Readiness

**Prepared:** 12 October 2026 (Asia/Bangkok)  
**Repo:** https://github.com/9GotStory/smart-srrt  
**Last verified main:** `7a8e2efeab239bac9bf708ed1e86f28b710f6726`  
**Last verified post-merge CI:** https://github.com/9GotStory/smart-srrt/actions/runs/38205839537 — **SUCCESS**, 60 contract tests, 419 full regressions, Native 24-file parity, UI assets, offline P6 `codeGate=PASS`, **`releaseDecision=HOLD`**.  
**Readiness desk report:** [docs/release/security-release-readiness-review-2026-10-12.md](../release/security-release-readiness-review-2026-10-12.md).  
**Current decision:** **SOURCE=PASS / LIVE OPS=UNVERIFIED / PRODUCTION DEPLOYMENT=HOLD.**

## Project context

Smart SRRT is an event-based surveillance and preliminary AI epidemiological reporting system for public-health teams, implemented with Google Apps Script, Google Sheets, Drive/Docs, Gemini API and Native HTML/CSS/JS. It is **not** a diagnostic system or a replacement for clinical review.

Source of Truth: GitHub `main` and current `src/server/*.gs`, `src/web/*.html`, `tools/native-sources.mjs`, `AGENTS.md`, `README.md`, `docs/features.md`. Source includes 7 native GS modules + 16 HTML partials + generated Index = **24 files**. `dist/apps-script/` is generated/untracked and not expected on GitHub. The two root One-Click artifacts are **frozen historical snapshots; never modify or overwrite them**.

**GS Architecture Improvement has completed source-level merges**:
- GS-S1 operator Server RPC / trusted Google identity: [PR #95](https://github.com/9GotStory/smart-srrt/pull/95), merge `378506e19d418739e13cfb12e171bb722300a439`.
- GS-S2 credential-safe new AuditLogs writes: [PR #96](https://github.com/9GotStory/smart-srrt/pull/96), merge `22ee59e10d1dc79b72c0846413d6793cb2eb8f10`.
- GS-S3 versioned salted PBKDF2, legacy login upgrade, throttling and session invalidation: [PR #97](https://github.com/9GotStory/smart-srrt/pull/97), merge `4cb18cee7db1e814b6d4c85fc395d5a363b19c06`.
- GS-S4 server-issued report regeneration consent: [PR #98](https://github.com/9GotStory/smart-srrt/pull/98), merge `64f4cc3ae319319bac3ceb0818aad26d149d3200`.
- GS-S5 Audit write observability and Admin status: [PR #99](https://github.com/9GotStory/smart-srrt/pull/99), merge `7a8e2efeab239bac9bf708ed1e86f28b710f6726`.

**Important:** `docs/implementation/gs-s1...` through `gs-s5...` were written before their respective merges and may still include “candidate / NOT MERGED”. The actual GitHub PR state is merged; Apps Script deploy remains a separate unapproved operation.

## Readiness findings: mandatory HOLD gates

**New high-risk rollback finding (RR-R01):** GS-S3 migrates the old stored SHA-256 verifier to `pbkdf2-sha256$` at successful login. **Older GAS source only understands SHA-256**, so a plain rollback to pre-GS-S3 code after users log in would lock out migrated accounts. First priority is to design a **forward-compatible rollback/recovery strategy with offline tests**. Never weaken credential storage or reset live accounts just to make rollback work.

Other release blockers:
- RR-R02: inspect deployed access/`executeAs` read-only and validate `GS_TRUSTED_OPERATOR_EMAIL` active AND effective identity in a **separate approved non-production** project; `getActiveUser().getEmail()` can be blank.
- RR-R03: real Apps Script benchmark needed for 12,000 HMAC rounds, including quotas, concurrent logins and legacy migration; Node VM tests are not live performance evidence.
- RR-R04: ScriptCache account-specific throttling is best-effort, not guaranteed global/per-client abuse prevention; decide production audience/access and compensating controls.
- RR-R05: assess historical AuditLogs, archives and backups for pre-GS-S2 password/hash exposure under **separate restricted approval**, with credential rotation, retention and audit integrity decisions.
- RR-R06: the actual target `appsscript.json`/OAuth scopes/deployment version/execute-as are **not present in GitHub**. Preserve, back up and verify in authorized operator workflow. The operator-only G-34 `clasp push` changes the remote mutable source and needs independent approval, careful staging and rollback.
- RR-R07: synthetic non-production integration test for legacy/new login, sessions, first/repeated reports, unknown jobs, Audit failure/post-commit semantics and authentic Google services.
- RR-R08: Product Owner/DPO decision for Gemini clinical narrative transfer, privacy/legal basis, public aggregates and small-cell disclosure.

Platform limits to consider: Apps Script script runtime **6 min/execution**, Script Properties **9 KB per value / 500 KB total** (confirm at time of test). The report consent uses Script Properties; GS-S5 health telemetry is best effort, not guaranteed full Audit completeness.

## Agreed engineering workflow

- The ChatGPT assistant performs the analysis, source authoring, test/ref inspection and review itself, **not Codex/Claude/Multica external agents**. Label this an **author-assisted Technical Review, not independent**.
- Use GitHub connector, Native source first, branch → PR → exact-head Actions tests → allowed file scope / Exact SHA review → **Product Owner expressly approves Merge** → post-merge Actions verification.
- **Never assume approval to Merge also approves Apps Script Deployment**. Existing One-Click files are frozen; avoid changing their outputs.
- The most recent explicit approval was to **perform this read-only Security Release Readiness Review and prepare a new-chat Handoff**. It did **not** authorize a deployment, touching actual UserAccounts, password resets, Gemini/Workspace calls, Script Properties mutation, historical AuditLogs scans or a new production migration.
- If a documentation-only readiness PR is open, **do not Merge it without separate approval**. Read its exact HEAD and CI before requesting approval.

## What to do next in the new chat

1. **Recheck current GitHub `main`, the Release Readiness Report and any open docs-only PR**. Do not assume recorded SHA is still HEAD if remote has advanced.
2. Confirm the Release Readiness Review has exact-head Actions and appropriate docs-only scope. Request explicit Product Owner consent before Merge.
3. Following approval and Post-Merge PASS, propose **RR-01: backward-compatible authentication rollback plan** on a separate branch, keeping current GS-S1 through GS-S5 protections and synthetic tests. Prefer an isolated source-only compatibility strategy before any Apps Script project interaction.
4. Keep **DEPLOYMENT=HOLD**. Do not initiate `clasp push`, `update-deployment`, Apps Script migration, production data access or live integration tests without new explicit authorization.

## Read first

- `AGENTS.md`, `README.md`, `docs/features.md`.
- `docs/architecture/gs-architecture-review-2026-10-12.md`.
- `docs/implementation/gs-s1-operator-rpc-boundary.md` through `gs-s5-audit-observability.md`.
- `docs/deployment/g34-native-multifile-apps-script.md`.
- `docs/release/security-release-readiness-review-2026-10-12.md`.

**Start instruction for next chat:** “ดำเนินการต่อ Smart SRRT ตาม Handoff โดยตรวจ Exact SHA และสถานะ PR บน GitHub ก่อน อย่าใช้ Codex/Claude/Multica, อย่า Deploy Apps Script, อย่า Merge โดยไม่มีคำอนุมัติ ให้เริ่มจากปิดเอกสาร Security Release Readiness Review แล้ววางแผน RR-01 Authentication Rollback Compatibility เป็นลำดับแรก”
