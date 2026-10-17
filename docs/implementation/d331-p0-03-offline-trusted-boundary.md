# Smart SRRT Dengue 3-3-1 — P0-03 Synthetic Trusted-Boundary Composition

**Status:** source-only candidate for independent review; no operational authorization. **Base:** `main@35a842bf08239abe6ac45491c9c91c57f2fdb372`.

## Purpose
Compose prior in-repository pure contracts (`00-g1a` UUID/revision, `03-n1b1` trusted-row Event/Area/capability, `04-n1b2b` 39/10-column snapshot header vocabulary, and `07-p0-02a` Option A 22-column grant shape) without building new Auth, database, Google resources, UI or server entrypoints.

`src/dengue/08-p0-03-offline-trusted-boundary.gs` deliberately accepts **only an injected synthetic-memory provider**. Its provider may be forged and is **not** authoritative. It is **NOT registered** in `tools/native-sources.mjs`, and exposes no public Google Apps Script RPC. A synthetic `SIMULATED_ALLOW` response is never a real user access grant.

## Enforced in the synthetic composition
- Current synthetic session must be active, but Staff/Admin/Super Admin alone grants nothing.
- Request includes only exact lowercase EventID UUID, `dengue.case.read` or `dengue.case.write`; a write additionally needs expected positive Revision. Browser-provided user, grant, AreaID, policy, raw rows, or arbitrary operation are rejected.
- Verify exact **39 MainData, 10 AreaMaster and 22 D331AccessGrants** headers and synthetically assert one matching EventID, active/closed status rules, active unique AreaID and exact village code/location.
- Require versioned current **synthetic-only** exact-disease allowlist; nothing can activate real clinical disease mapping.
- Only one effective active synthetic grant matching UserID, EventID and capability, plus AreaID and policy revision, valid UTC interval, approval provenance; reject duplicate GrantID or duplicate active tuple. No wildcard/role shortcut.
- Return minimal simulated EventID, Revision, AreaID and operation metadata; no patient data, user identifier, token, grant or narrative. All runtime-like denial paths use generic `D331_P003_DENIED`.
- Read/write evaluations are **pure**: even a write decision does not persist rows or mark a ledger entry COMMITTED.

## Deliberately not solved and HOLD
- `getUserByToken_` and `getDb_` are not executed: existing helpers can transitively alter Script Properties when database property missing. No Script/Deployment/Spreadsheet binding attestation has been run; canonical references remain in private #189.
- Synthetic provider identity does not prove trusted server origin, actual Session revocation, approved Clinical policy, current legal/privacy basis, actual D331AccessGrants lifecycle, duplicate/restore journal, physical DDL, Google Sheet read/write, idempotent write/lock, patient DTO or Deployment.
- Option A grant header design is a **candidate**, not authorization to create a tab. `D331_G1A_ENABLED=false` and existing Native runtime behavior unchanged.
- Full authorization and release require distinct Product Owner/clinical/security/privacy/DEV gates; no Production is configured.

## Scope and verification
Three additive source-only files: `src/dengue/08-p0-03-offline-trusted-boundary.gs`, `tests/d331-p0-03-offline-trusted-boundary.test.mjs`, this document. No files in `src/server/` or `tools/native-sources.mjs` are modified.

Run `npm run check:contracts`, `npm test`, `npm run build:check`. Product Owner Merge authorization remains separate from source implementation and CI. Do not deploy, create Sheets, access real patient data or activate feature.
