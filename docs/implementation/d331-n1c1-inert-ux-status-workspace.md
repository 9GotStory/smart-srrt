# D331 N1-C1 — Inert Dengue UX Status Workspace (Source-only)

**Issue:** #192 · **Architecture:** #178, #183 · **Development/Testing identity record:** private #189 · **Base:** `main@fb8e69aeec73fa0bde8ea8e64b9a3f47a79a9777`

## Purpose

Prepare a small, responsive and accessible Thai-language UI building block for **Dengue 3-3-1 inside the existing Smart SRRT** without making any clinical assumption, leaking patient information, or enabling a new UI menu. There is no Production environment. These components are **unregistered offline source**, not a deployed or operational D331 page.

The future UI should integrate into the existing `src/web/02-app-layout.html` sidebar/section shell and existing `showPage`, `updateAuthBox`, `uiBeginAction`, logout/session invalidation, and shared CSS. **This PR does not perform the integration**; that requires a separately approved gate with a server-authoritative capability response.

## Source shape

`src/web/03l-client-d331-status.html` is a native-compatible HTML partial containing scoped styling and a single small classic-script global, `d331N1cStatusWorkspace_`. It has **no auto-mount, no RPC, no network APIs, no patient fields, no DOM access until the caller provides a root** and no enabled buttons. It is **deliberately absent** from `tools/native-sources.mjs`, the Native25 package, `Index.html`, the existing sidebar and deployed runtime.

The UI renders only fixed, non-user-supplied Thai status labels:

| State | Purpose | Allowed UI |
| --- | --- | --- |
| `OFF` | Feature disabled (default and unknown-state fallback) | Static notice, disabled actions |
| `AUTH_REQUIRED` | Future signed-out state | Static notice, disabled actions |
| `POLICY_HOLD` | Clinical/grant/privacy gate pending | Static notice, disabled actions |
| `NO_GRANT` | No D331-specific server-approved grant | Static notice, disabled actions |
| `LOADING` | Future state while authoritative readiness is fetched | `aria-busy=true`, neutral skeleton, disabled actions |
| `EMPTY` | Future authorized list with no displayable items | Static notice, disabled actions |
| `ERROR` | Cannot establish authoritative readiness | Static notice, disabled actions |

`READY`, `ENABLED`, arbitrary client strings, untrusted objects, and malformed values **always fall back to OFF**, never to an enabled state. This UI is **not** an authorizer; any future render of `NO_GRANT` or `EMPTY` must be driven by an authenticated server check, not browser-supplied `role`, `AreaID` or patient data. Until future grants and clinical approvals exist, the domain remains `OFF`.

The renderer accepts a deliberately injected DOM root, builds nodes with `createElement` and **`textContent` only**, uses `role=status` and `aria-live=polite`, marks loading with `aria-busy`, and replaces prior children so repeated states cannot duplicate controls. Both placeholder buttons are always disabled, have `type=button`, and make **zero** calls. `reset` returns the root to OFF. No workflow semantics for the "3-3-1" timing or clinical interventions are invented.

## Tests and boundaries

`tests/d331-n1c1-inert-status-ux.test.mjs` uses an isolated synthetic DOM and `node:vm`; verifies unregistered Native25, G1-A OFF, unknown-input fail-closed, all seven safe states, aria-live/busy/skeleton, no duplicated actions after rerender/reset, injection/PHI-string nonreflection, and lack of fetch/GAS/Google/Auth/routing side effects. Ordinary contracts and complete regression CI still apply.

### Next separately approved integration stages

1. **N1-C2 source integration:** redesign actual sidebar and page only after an approved placement/accessibility/navigation plan. If feature OFF, no live Dengue page or nav item; do not infer capability from client roles. Maintain existing five pages, guest/public data protections, no stale state after logout, and no new public RPC. This step requires its own Source CI, exact SHA, and Merge gate.
2. **B2D trusted server read:** only with verified existing Development Script/Deployment/Spreadsheet property binding, signed exact Dengue disease label policy, authoritative revocable D331 grants, AreaID semantics, privacy/PHI and storage decisions. **None is granted by this UX prototype**.
3. **Physical DDL / DEV/TEST activation:** still separate gated work; no scripts or Sheets were read/written to create this UI source.

**No Production exists.** Canonical Script/Deployment/Spreadsheet IDs are retained only in **private GitHub Issue #189**, not copied into code, CI, this document or public assets.

**Current gate:** `N1_C1_UX_OFFLINE_SOURCE=IN_REVIEW`, `D331_G1A_ENABLED=false`, `N1_C1_HTML_REGISTERED=NO`, `NO_NETWORK_NO_DATA`, `B2D/DDL/DEPLOY=HOLD`, `PR_MERGE=HOLD`.