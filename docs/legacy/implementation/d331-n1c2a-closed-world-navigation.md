# D331 N1-C2A — Closed-World Existing Navigation Gate

**Issue:** #194 · **Parents:** #178/#183; N1-C1 #192 merged · **Exact baseline:** `main@2ece5a81710fd501d14daf81806466c4bd3e97a5` · **No Production exists**.

## Why this is N1-C2A instead of activating the Dengue menu

The new N1-C1 `src/web/03l-client-d331-status.html` component remains intentionally **UNREGISTERED**. Native25's 8 GS / 16 HTML partials + generated Index has an exact deployment backup/stage allowlist, strict client ordering and many contract tests. Registering a new 17th HTML partial immediately would require a full Native26/stage/deploy-guard contract upgrade, even with the feature disabled. More importantly, the D331 clinical disease policy, grant/AreaID authority, privacy and real Script Property binding are not yet independently attested. **Do not expose a clickable Dengue menu before these gates.**

This slice hardens the **existing Smart SRRT shell's navigation seam** as an incremental Source-only prerequisite. It does not claim the D331 UI is displayed or operational.

## Authorized code change

In existing `src/web/03c-client-auth.html`, `showPage(page,btn)`:

- Accepts **only** the five existing pages: `dashboard, records, reporter, admin, library`.
- Rejects unknown, malformed and `dengue` route requests **before** changing any active section/nav state, closing the sidebar or initiating a page read.
- Rejects an absent target section before DOM mutation (fixes a preexisting null-target throw).
- Enforces existing `roleCanRecord()` for direct `records` / `reporter` calls, and preserves existing `roleCanManage()` for `admin`. These are **UI navigation guards only**, not a replacement for server-side authorization or new D331 access grants.
- Looks up the selected nav element in the trusted in-document `.nav button` list, rather than trusting an arbitrary caller-supplied `btn` object. Only known authorized routes retain the existing table/Library/Admin load side effects.

## Tests

`tests/d331-n1c2a-closed-world-navigation.test.mjs` isolates the **actual existing** `showPage` source from the canonical HTML in a Node `vm` synthetic DOM. Seven tests check:

- Current five page IDs + nav unchanged; D331 UX partial is still unregistered and flag is OFF.
- `dengue` / unknown / prototype-style / malformed route calls do not alter active state, focus/navigation indication, trigger callbacks, or send RPC.
- Missing route target does not destroy the prior current page.
- Guest cannot force `records`, `reporter` or `admin` page selection programmatically; existing server authorization remains authoritative.
- Legitimate logged-in users retain five existing navigation flows and relevant page-load callbacks.
- Forged `btn` cannot introduce a new nav entry.
- Route code has no D331 grant/feature grant inference, Apps Script calls, patient reads or Script Property mutation.

No user, EventID, AreaID, PHI, Script ID, Deployment ID, Spreadsheet ID or other identifier is added to the repo. The private identity inventory remains **only in Issue #189**, not source or CI.

## Deferred work (separate Product Owner authority)

**N1-C2B:** Real page and sidebar integration, Native26 manifest/backup and stage allowlist compatibility, authenticated server-declared D331 readiness (not client role), logout/session-epoch invalidation, loading/unknown/error handling and controlled UI acceptance. This requires separate scope/approval. Showing an inert mock page is not an authorization solution.

**N1-B2D / physical DDL / DEV-TEST deploy:** Still require actual Script→Deployment→`DATABASE_SPREADSHEET_ID` attestation, signed disease label allowlist and per-user revocable D331 grant model, privacy/retention and AreaID binding, plus schema and deployment-specific Human Gates. `D331_G1A_ENABLED=false` stays unchanged.

**This PR:** navigation guard, one offline synthetic test, one **existing R2 navigation harness fixture correction** supplying explicit authorized role mocks (previous harness had no `roleCanRecord()`), and this document. No Native25 registration, no Google APIs or metadata read, no `clasp`, no Script/Sheet changes, no new page, no UI feature enable, and no deployment. Source review and CI must pass before a distinct approval to Merge.