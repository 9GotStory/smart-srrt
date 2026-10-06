# Smart SRRT — Group A + B Development Plan

## Goal

Improve Smart SRRT while preserving its intended scope:

> Event-based epidemiological surveillance + investigation monitoring + AI-assisted preliminary reporting.

The project must not expand into a full HIS, LIS, contact-tracing platform, project-management suite, or e-Office system.

## Scope decisions

### Group A — must fix

- G-01 Stable Event ID
- G-02 Remove row-number identity dependency
- G-20 Replace hard delete with non-destructive event disposition
- G-22 Separate public Dashboard data from raw event data
- G-23 Correct KPI / canonical classification semantics
- G-27 Link generated reports back to events
- G-30 Modularize source and establish engineering baseline

### Group B — add lightweight capability

- G-03 Lightweight Event lifecycle
- G-04 Soft workflow consistency rules
- G-05 Event owner / assigned user
- G-11 Event attachments backed by Google Drive
- G-17 Lightweight report registry
- G-19 Close / reopen lifecycle
- G-21 Audit retention / archival policy
- G-24 Limited MasterData administration
- G-26 AI report readiness warnings
- G-29 VisitLogs semantic cleanup

## Explicitly deferred

- Investigation team management
- SLA / escalation rules
- Notification engine
- Outbreak entity
- Report version-management layer

These require validated business requirements before implementation.

## Explicitly out of scope

- Full task/project management
- Laboratory information system
- Patient-level case registry
- Contact tracing registry
- Full Event → Case → Contact → Outbreak relational model
- Full report approval / e-Office workflow
- Full notification transaction subsystem

## Delivery phases

### P0 — Repository & characterization baseline

Purpose: establish a safe engineering foundation without changing business behavior.

Deliverables:
- canonical repository baseline
- documented source-of-truth policy
- modularization design
- characterization test plan
- schema inventory
- RPC/API inventory
- migration policy
- release/version policy

Gate:
- baseline behavior documented
- no production behavior intentionally changed
- baseline commit remains reproducible

### P1 — Event identity & data integrity

Scope:
- G-01, G-02, G-20

Target model, subject to implementation review:
- stable `EventID`
- revision/concurrency metadata
- created/updated metadata
- non-destructive record status
- event lookup by ID rather than sheet row

Migration requirements:
- existing events receive stable IDs
- migration is idempotent
- old rows remain readable
- backup/dry-run/rollback evidence required

### P2 — Privacy boundary & analytics correctness

Scope:
- G-22, G-23

Target:
- public aggregate Dashboard contract
- authenticated event list/detail contracts
- exact/canonical criteria semantics
- KPI numerator/denominator correctness
- consistent category codes/normalization strategy

Gate:
- anonymous clients cannot receive private raw event rows
- KPI regression tests cover `เข้าเกณฑ์`, `ไม่เข้าเกณฑ์`, and pending values

### P3 — Lightweight event workflow

Scope:
- G-03, G-04, G-05, G-19

Target:
- simple event lifecycle
- owner assignment
- close/reopen
- warnings for inconsistent transitions
- avoid hard workflow blocking unless a rule is safety/data-integrity critical

Do not introduce a generic workflow engine.

### P4 — Supporting data governance

Scope:
- G-11, G-21, G-24, G-29

Target:
- Drive-backed attachment registry
- audit retention/archive policy
- limited MasterData admin surface
- VisitLogs schema/semantic cleanup

Do not build a custom file-management platform.

### P5 — AI report governance

Scope:
- G-17, G-26, G-27

Target lightweight report record:
- ReportID
- EventID
- DocumentID / URL
- GeneratedAt / GeneratedBy
- model metadata
- prompt version
- readiness warnings before generation

The system remains an AI-assisted draft generator; full document approval remains outside scope.

### P6 — Hardening & release

Scope:
- complete G-30
- regression
- migration verification
- release packaging
- deployment/runbook updates
- rollback validation

Gate:
- clean migration from the v2026.09.08.1 baseline
- existing installations remain supportable
- one-click operational simplicity is preserved where practical

## Engineering guardrails

1. GitHub is the source of truth for source, tests, migrations, and technical documentation.
2. Google Sheets/Drive/Docs remain runtime data/document services.
3. No secrets committed to Git.
4. Environment-specific IDs and credentials must not be hard-coded in source.
5. Prefer additive schema changes before destructive cleanup.
6. Every schema migration must be idempotent.
7. Every business-critical correction gets a regression test.
8. Public and authenticated data contracts must be separate.
9. AI output is advisory/draft content, not authoritative epidemiological classification.
10. Keep the district-level deployment operationally simple.

## Recommended immediate sequence

1. Freeze and document baseline.
2. Inventory current server functions and browser RPC calls.
3. Write characterization tests for criteria/KPI, permissions, event CRUD contract, installer behavior, and report prerequisites.
4. Define the additive EventID migration contract.
5. Only then begin P1 implementation.
