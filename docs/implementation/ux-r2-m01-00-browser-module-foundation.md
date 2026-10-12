# UX-R2-M01-00 — Native Browser Modular Test Foundation

**Status:** implementation candidate (PR pending); not merged or deployed.
**Base:** main@3a803d13b67977cde609bdd6147648b691d32ec2 (after UX-R2-03B / PR #87).
**Scope:** tests, test-only helpers, and documentation. No runtime/server/client edits, schema changes, or release-script changes.

## Architectural decision

The next frontend refactor uses ordered classic inline JavaScript within native HTML partials. tools/native-sources.mjs remains the source of truth for include ordering. The app retains HTML Service, google.script.run, global inline event handlers, and a single final boot() call. This does not authorize ES modules, runtime import/export, a browser bundler, or a new framework.

This phase preserves the existing native release size: seven server files, six HTML partials, and generated Index.html = 14 staged files. Frozen historical One-Click blobs are not modified or rebuilt.

## Test foundation introduced

- tests/helpers/native-client.mjs reads the canonical ordered HTML manifest, extracts classic inline scripts, skips document-head external scripts, rejects malformed script tags and rejects type=module / async / defer script execution modes that invalidate deterministic ordering.
- tests/helpers/native-current.mjs additionally exports nativeClientScripts and nativeClientSource; the legacy nativeBrowser export is intentionally retained so existing G-26/G-32/G-33 tests keep working until their own reviewed extraction.
- tests/ux-r2-m01-browser-module-foundation.test.mjs characterizes source extraction, static parsing, one final boot, global names referenced by markup, shared classic global lexical scope, and synthetic reversed ordering / invalid script modes. The test deliberately skips the final boot call in its synthetic real-source VM evaluation, without making RPC calls.
- The current duplicate function declaration named fileToBase64 is deliberately characterized in its existing source; resolving it needs a separate behavior-preserving extraction review, not silent changes here.
- A conservative two-space-indented function declaration scan catches new cross-file duplicate-name signals but does not claim to be a complete AST/global-scope audit.

## Deferred until actual file extraction (M01-01 onward)

When new HTML partials are added, update native-sources.mjs first and review every static Native file-count assertion, P6/G-30/G-34 expected bytes, trusted Index include ordering, and the exact deploy-g34-clasp.sh stage allowlist together. The guarded deploy script must never be run as part of an implementation PR. All preserved server-side RBAC, public aggregate-only, EventID/Revision, attachment, AI report single-action, and session-race invariants remain mandatory.

## Read-only acceptance pipeline

Run in this order on the development checkout or GitHub Actions:

    npm ci --ignore-scripts --no-audit --no-fund
    npm run check:ui-assets
    npm run build:gas-multifile
    npm run build:check
    npm run check:gas-multifile
    npm run check:contracts
    npm run release:preflight
    npm test

P6 releaseDecision remains HOLD even if codeGate passes. CI passes do not mean browser UAT or deployed HTML Service validation. Web App @10 is unchanged. Review on the candidate SHA must be labeled: ChatGPT Technical Review (author-assisted; not independent). Product Owner approval is separately required before merging, and deployment is another separate authorization.
