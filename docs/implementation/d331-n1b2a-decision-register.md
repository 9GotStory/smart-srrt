# D331 N1-B2A — Decision Register & Human Gates

**Canonical Design:** [d331-n1b2a-trusted-server-adapter-design.md](./d331-n1b2a-trusted-server-adapter-design.md)  
**Issue:** #183 · **Source:** `main@663126b7d5220f2ef74a6d88683eb36a504cb441`  
**Overall decision:** DESIGN REVIEW ONLY. Unapproved/unknown condition = DENY. This register approves **no** real-data read, patient DTO, DDL, or Deployment.

| ID | Decision requiring owner/security/clinical signoff | Proposed safe default until signed | Gate |
| --- | --- | --- | --- |
| B2-D01 | What exact, versioned clinical disease labels/codes in MainData col6 qualify for Dengue? Include synonym/exclusion treatment | **Empty allowlist → deny all**; no insect-borne-group inference | Clinical HOLD |
| B2-D02 | What is the authoritative, revocable D331 grant registry and who may approve/edit it? | **No D331 grants** even to Super Admin; no inheritance from existing role | Security/DDL HOLD |
| B2-D03 | If using separate `D331AccessGrants` tab, is increasing original 7-table D331 physical plan allowed? If not, choose audited alternative with strict lifecycle | **No schema expansion without explicit DDL review** | DDL HOLD |
| B2-D04 | What is an exact AreaID identity across AreaMaster and MainData: village number/code, name and leading zeros? | Exact match, boolean Active=true, no fuzzy fallback; reject unknown/ambiguous | Data Owner HOLD |
| B2-D05 | How to treat pre-existing MainData rows with blank OwnerUserID/villageCode or display-only numeric Revision? | Exclude/deny; do not auto-backfill or coerce during read | Data Migration HOLD |
| B2-D06 | Which private account/Script/Spreadsheet is the current DEV target, and who vouches that it is not Production? | No Google API; no Script Property write; no active sheet fallback | DEV Preflight HOLD |
| B2-D07 | What are role-by-capability approval, expiry, revocation and audit conditions for staff/health units? | Per-user exact approval, least privilege, reevaluate every request | Security HOLD |
| B2-D08 | What data minimization, consent/legal basis, retention, export and AI-use rules apply to D331 PHI? | No patient fields, no bulk exports, no Gemini transfer | Privacy HOLD |
| B2-D09 | May B2-B be implemented with strictly synthetic, injected mock connectors (unregistered, feature disabled)? | Do not begin implementation without separate source-only gate | Product Owner HOLD |
| B2-D10 | May metadata-only existing DEV binding/header inspection occur? Exact read fields and custodian? | **Not authorized**; guard against mutating `getDb_`, `ensureSheet_` and repair | Product Owner HOLD |

## Gate protocol

- **B2A documentation:** document-only Draft PR, review markdown scope, source evidence and policy gaps; merging documentation would **not** approve B2-B/C/D.
- **B2B mock-only code:** future separate source-only PR with injected validated snapshots, all-negative synthetic tests, unregistered modules, no Google methods, no public entrypoints. Requires specifically scoped Product Owner authority.
- **B2C read-only DEV metadata:** requires approved DEV identity and private evidence, limited APIs, no PHI row reads, no `getDb_` implicit property changes.
- **B2D D331 runtime:** gated on signed clinical/security/privacy policies, verified data/header/grant storage, target, tests, and separate TEST Release/Production policy. No deployment in B2A.

## Operator-safe evidence classification

Send only status codes and proof descriptions, never raw patient data, tokens, account emails, ScriptID, SpreadsheetID, folder IDs or private document URLs. A custodian maintains evidence in a restricted store; GitHub stores status-only findings.

```text
B2A_DESIGN=REVIEW_PENDING
B2A_MAIN_SOURCE_SHA=663126b7d5220f2ef74a6d88683eb36a504cb441
B2A_EXISTING_DEV_TARGET=NOT_VERIFIED
B2A_DENGUE_DISEASE_POLICY=NOT_APPROVED
B2A_D331_GRANT_REGISTRY=NOT_APPROVED
B2A_AREAMASTER_BINDING_POLICY=NOT_APPROVED
B2A_PRIVACY_AND_RETENTION_POLICY=NOT_APPROVED
B2A_GOOGLE_API=NOT_PERFORMED
B2A_MAIN_DATA_READ=NOT_PERFORMED
B2A_WRITES=NONE
B2B_IMPLEMENTATION=HOLD
B2C_DEV_METADATA=HOLD
B2D_RUNTIME=HOLD
TEST_DEPLOYMENT=HOLD
PRODUCTION=HOLD
```

**No automatic promotion:** PASSing markdown/CI does not mean these Human Gates are satisfied.