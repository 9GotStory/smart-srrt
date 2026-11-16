# G-31 — Gemini 3.8-only AI report reliability and result UI

## Scope / user decision
This change implements Smart SRRT's explicit **Gemini 3.8 Flash ONLY** requirement and addresses two observed P6 test issues: HTTP 503 leading to 360-second GAS timeouts ([#57](https://github.com/9GotStory/smart-srrt/issues/57)), and a report already saved in Docs/ReportRegistry while the browser still shows a static `กำลังสร้างรายงาน...` popup ([#56](https://github.com/9GotStory/smart-srrt/issues/56)).

**Layer:** modular source and deterministic One-Click output only. Schema v7, current users, Sheets/Drive/Docs settings, templates and registered report history are unchanged by this code patch. The actual Web App is **not** automatically deployed from GitHub.

## Backend contract
- Only `models/gemini-3.8-flash` can be selected for report generation. The pinned resolver ignores any cached choice for other models and checks whether this exact model offers `generateContent`.
- One Gemini generation HTTP request per part (1–3, 4–6), with no cross-model failover or automatic POST retry on 503, 429 or other errors.
- Record sanitized model, API version, HTTP status and duration; never log the API key, prompt, patient narrative or response body.
- If the first request took over 120 seconds, decline to **start** the second; explain the latency risk clearly.
- A **single** synchronous `UrlFetchApp.fetch` may itself still block until GAS execution ends. This is a platform limitation, not solved by a JavaScript elapsed-time check. Do not claim an absolute sub-360-second bound.
- Previously stored reports may legitimately list other Gemini models; do not rewrite historical registry metadata.

## Frontend contract
- Both the direct-ready route and G-26 advisory **สร้างรายงานต่อ** route use the same in-page result modal.
- Loading message is explicitly non-final, and after success offers a verified-format clickable **เปิด Google Doc** link. No blank popup or automatic navigation is relied upon.
- Failures remain visible until closed and advise inspecting G-27 history before retrying, because a disconnected request could have completed server-side.
- Page-wide in-flight guards block overlapping report generation while a request is active, including different EventIDs sharing the same result modal. This is **not durable server-side idempotency** across multiple tabs, browser crashes or retries; that requires separate design/approval.
- Avoid showing the document link if the user logs out during an in-flight request.

## Validation requirements
1. `npm run build:check` — exact byte parity of modular source and both generated One-Click artifacts.
2. `npm run release:preflight` — read-only v7, report permission and history checks; releaseDecision remains **HOLD**.
3. `npm test` — existing suite plus simulated cached-nonpinned selection, 503/429, success across two pinned requests, budget guard, and UI contracts.
4. Independent review of the changed files and resulting GitHub Actions, then human acceptance before an intentional Test Web App deployment.
5. **Only after approval and deploy**, run P6 UAT on existing test-only workbook with the **user-chosen converted Word Google Docs Template**, verify a newly appended ReportRegistry entry has `GeminiModels=models/gemini-3.8-flash`, and G-27 opens the generated Doc.

## Boundaries
- Do not rerun schema migrations or installation.
- Do not merge Draft PR #54 or this stacked Draft PR without a separate Product Owner decision.
- Do not automatically retry Gemini after 503 or generate multiple Docs as a test shortcut.
- Existing Word-derived template remains selected in the test workbook settings and is not part of this code diff.
