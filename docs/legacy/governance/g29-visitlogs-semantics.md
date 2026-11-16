# G-29 — VisitLogs Semantic Cleanup Contract

Scope: G-29 VisitLogs semantic cleanup  
Parent: G-24 Limited MasterData administration  
Schema version: **6**

## Purpose

G-29 corrects the meaning of the existing VisitLogs data without turning Smart SRRT into a web analytics or visitor-identification platform.

The original implementation created:

- `Timestamp`
- `Page`
- `UserAgent`

but actually stored:

- request timestamp;
- literal `doGet`;
- JSON-serialized `e.parameter` values.

The third header was therefore incorrect, and persisting arbitrary query values created unnecessary privacy/security exposure.

## Target schema

VisitLogs remains exactly three columns:

| Column | Header | Meaning |
|---:|---|---|
| 1 | Timestamp | request time |
| 2 | EntryPoint | server entry point; currently `doGet` |
| 3 | LegacyRequestParams | historical pre-G-29 request-parameter payload only |

Schema version moves:

**5 -> 6**

No new VisitLogs columns are added.

## Legacy header migration

Known legacy headers:

- `Timestamp`
- `Page`
- `UserAgent`

are renamed in place to:

- `Timestamp`
- `EntryPoint`
- `LegacyRequestParams`

Existing row values are preserved exactly.

This makes historical data honestly labeled without silently rewriting or deleting it.

The migration also accepts the final G-29 headers idempotently.

Unknown/conflicting nonblank headers are rejected.

A blank header above existing data is rejected because the migration cannot safely infer the intended meaning.

## New logging behavior

After G-29, `doGet()` calls:

`logVisit_()`

without passing the request event object.

`logVisit_()` writes:

- current timestamp;
- `doGet`;
- blank `LegacyRequestParams`.

It does not inspect or serialize:

- `e.parameter`;
- query values;
- User-Agent;
- IP address;
- authenticated user/email;
- session token;
- visitor fingerprint.

The legacy third column exists only to preserve historical pre-G-29 rows.

## Privacy boundary

G-29 intentionally reduces data collection.

It does not attempt to infer visitor identity or device information.

No new telemetry provider, client tracking script, cookie, fingerprint, page-view event model, or analytics database is introduced.

## Migration entry point

Explicit operator function:

`migrateG29VisitLogs()`

It:

1. acquires ScriptLock;
2. validates/renames VisitLogs headers;
3. preserves all existing row values;
4. advances schema to at least version 6;
5. never downgrades a future schema version;
6. does not delete legacy request-param values automatically.

## Installer / repair

`installSmartSRRTCore_()` now calls:

`ensureVisitLogSchema_(ss)`

instead of recreating the misleading legacy header contract.

Install/repair:

- creates the final schema when VisitLogs is missing;
- migrates exact legacy headers when present;
- preserves historical rows;
- reports whether legacy headers were migrated.

## Why historical request values are not automatically deleted

Some installations may already contain request-parameter JSON in historical VisitLogs rows.

G-29 stops collecting those values immediately, but migration does not silently erase historical rows.

If an operator later decides those legacy values should be purged under a local privacy/data-retention policy, that should be an explicit separate data-cleaning decision after backup/review rather than an implicit schema migration side effect.

## Retention

G-29 does not add a VisitLogs retention/archive subsystem.

The agreed scope is semantic cleanup only.

Audit evidence remains governed separately by G-21.

If operational experience later shows VisitLogs volume needs a bounded retention policy, that can be specified independently with its own retention requirement rather than being hidden inside this change.

## Schema-floor compatibility

Migration floors remain separated:

- G-05 Event owner -> at least 3
- G-11 Event attachments -> at least 4
- G-21 Audit retention -> at least 5
- G-29 VisitLogs semantics -> at least 6

Older migrations must not claim schema v6.

## Rollback boundary

Rolling back application code after G-29 requires care because older installer code expects the legacy VisitLogs headers.

Do not rename the headers back merely to satisfy old code.

Preferred rollback:

- retain the corrected G-29 headers;
- retain all VisitLogs rows;
- restore only application code that does not force-repair VisitLogs using the old header names, or patch the rollback build to tolerate the corrected schema.

Re-enabling the old `logVisit_(e)` behavior would resume query-value collection and is not recommended.

## Verification checklist

Before production release:

1. back up the primary Sheet;
2. confirm current VisitLogs headers;
3. run `migrateG29VisitLogs()`;
4. confirm headers are exactly `Timestamp / EntryPoint / LegacyRequestParams`;
5. confirm historical row values are unchanged;
6. rerun migration and confirm it is idempotent;
7. confirm `SCHEMA_VERSION >= 6`;
8. open the Web App with arbitrary query parameters;
9. confirm the new VisitLogs row contains timestamp + `doGet` + blank column 3;
10. confirm the query parameter values do not appear in the new row;
11. confirm no User-Agent, IP, email, token, or visitor fingerprint is added;
12. confirm install/repair preserves the corrected schema.
