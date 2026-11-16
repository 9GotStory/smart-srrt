# G-30 — Canonical modular source and deterministic One-Click release

**Status:** G-30 code-only engineering baseline, stacked on G-27 Draft PR #52. **Schema v7 is unchanged.**

## Source of truth

The editable GitHub development source is under `src/server` and `src/web`. Explicit ordered lists in `tools/build-one-click.mjs` combine these into two committed One-Click release artifacts:

- `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs`
- `Index_Smart_SRRT_OneClick.html`

Node.js is for development and CI **only**; the deployed backend remains Google Apps Script with Google Sheets, Drive, Docs and Gemini, and the frontend remains HTML/CSS/Vanilla JS. District operators can continue deploying these two files without Node, Git, npm or clasp.

Use `npm run build` to reconstruct both root files. Use `npm run build:check` for strict **byte-for-byte comparison** without writing files. GitHub Actions enforces parity before running contract/syntax checks and complete P1–P5/G-27 regressions.

### The deliberately conservative split

Source was split at exact contiguous byte boundaries, not rewritten into classes/services. Its concatenation order is the only supported release packaging order.

Server modules (7): bootstrap; schema/migrations/DB; authentication/attachments; Events/Dashboard; admin/audit; report registry/models; Gemini/prompt.

Web modules (5): document head; styles; app layout; modals; browser script. The output retains original HTML tags and script positioning.

Development source modules are **not** individually deployed to Apps Script without further packaging validation; the verified One-Click artifacts are the supported operator entrypoint. Changes must be made in source modules first, then both generated root artifacts must be updated and committed.

### Shadowed declaration correction

G-27 declared `forceGeminiModelAuto()` twice at global scope. The second declaration was the effective runtime implementation and changes both value and label of GEMINI_MODEL before cache reset. G-30 removes only the shadowed first declaration and preserves the effective second declaration and its `forceGeminiModelStable()` compatibility alias. This is behavior-preserving source hygiene, not a new Gemini policy.

## Engineering invariants

- All browser `gs('functionName', ...)` calls must resolve to server functions, and there must be no duplicate global function declarations.
- JavaScript syntax is checked for the assembled Apps Script server and embedded browser script.
- Existing browser RPC signatures, EventID, Revision, G-04 warnings, G-17 append-only registry, G-26 advisory readiness, G-27 read-only history and privacy boundary remain unchanged.
- No new sheets, schema migration, report approval, workflow engine, storage technology or production runtime dependency was introduced.
- All migrated legacy data stays in place.
- This current canonical P6 branch must not be merged with old divergent `refactor/p6-modular-release` PR #17.

## Deferred release gate

Node/CI tests prove deterministic source parity and characterization, **not** live Google Apps Script behavior. The required staged migration, template, Google Docs/Drive access and live report-generation smoke remain intentionally deferred. No merge or production deployment is permitted without separate human approval.
