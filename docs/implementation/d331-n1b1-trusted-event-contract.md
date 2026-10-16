# D331 N1-B1 — Offline Trusted Event/Area/Capability Contract

Parent #178 · Child #181 · Source-only contract, NOT an operational RPC.

## Source anchors (verified in main@d79e8ac767668e8cff581374bf96062e0a89bbcb)
- MainData 39 columns. Disease **col6**, village number **10**, tambon **11**, amphoe **12**, province **13**, village name **29**, village code **30**, EventID **31**, Revision **32**, RecordStatus **33**, OwnerUserID **39**.
- AreaMaster 10 columns: AreaID, Province, Amphoe, Tambon, Moo, VillageName, VillageCode, Active, UpdatedAt, UpdatedBy.
- Auth comes from current Smart SRRT token + UserAccounts. Existing role `view`/`edit` or free-text UserAccounts area does **not** authorize D331 data.
- `getDb_()` can set `DATABASE_SPREADSHEET_ID` on fallback; prohibited in read-only verification.

## B1 contract
The new `src/dengue/03-n1b1-trusted-event-contract.gs` is **not registered in Native25**. Functions are `d331..._` private helpers and operate only on synthetic or already trusted in-memory inputs, without Google APIs or patient DTOs. No public RPC. It projects:
- exact 39-col parent with valid UUID, positive Revision and active/closed status;
- **explicit server-approved exact disease labels**, no implicit substring match or master-group fallback;
- unique Active AreaMaster row matching all relevant fields including village code; duplicate AreaID/ambiguous/missing match deny;
- authenticated active UserAccount matched to separately approved user-specific D331 grant (capabilities, AreaIDs, optionally EventIDs), with no role-based implicit grant;
- D331 G1-A authorization and exact expectedRevision on write; no access to closed/void parent for writes.
Returned DTO is limited to EventID, Revision, AreaID, capability and read/write mode, never narrative/patient fields.

**Trust boundary:** Function parameters **are not verified authoritative merely by being passed to these pure helpers**. A later separately reviewed N1-B2 must supply them only from validated server session, header-verified MainData and AreaMaster reads, and a signed explicit grants/disease policy. No caller/browser-provided principal, event row, grant or allowlist may be trusted. The module stays OFFLINE and does not turn the application's feature on.

## Remaining Human Gates
- N1-B2: trusted live adapter, policy storage/permissions, no fallback DB write in read-only mode, server-side authorization and narrow RPC contract — separate review/approval.
- N1-C: UI, loading and session invalidation — separate.
- N1-D: D331 7-table clinical physical DDL and privacy review — separate.
- N1-E: preflight exact existing DEV IDs/ACL/backup and separately approved schema write — HOLD.
- N1-F: TEST deployment/clinical feature enablement — HOLD; Production always separate.
- PR Merge and deployment are **not** implied by green CI.

## Tests
`node --test tests/d331-n1b1-trusted-event-contract.test.mjs` uses synthetic data only. `npm test` covers regressions. No Production data, Google API, `clasp` or schema actions.
