# Smart SRRT — Migration, Version & Release Policy

## 1. Source of truth

GitHub repository `9GotStory/smart-srrt` is the source of truth for:

- application source
- tests
- schema/migrations
- architecture/technical documentation
- release notes

Google Sheets, Drive and Docs remain runtime data/document services.

## 2. Frozen legacy baseline

Canonical AS-IS:

`main@799418cad8d570f5ec0adcb37a641977b25f9650`

Application config version:

`2026.09.08.1`

The baseline must remain reconstructable. Modernization must not rewrite history or silently alter the baseline artifact.

## 3. Version dimensions

Future releases should distinguish at least:

- **AppVersion** — user-facing application release
- **SchemaVersion** — persistent Sheet/data structure
- **PromptVersion** — AI report prompt contract when report registry is introduced

Do not infer one version solely from another.

## 4. Migration principles

Every persistent-data migration must be:

1. **idempotent** — safe to run more than once;
2. **additive first** — add columns/sheets before removing legacy structures;
3. **observable** — return/report what changed;
4. **verifiable** — explicit pre/post checks;
5. **recoverable** — backup and rollback plan before destructive operations;
6. **scope-limited** — no unrelated normalization during a migration.

## 5. Existing-installation rule

A system installed from v2026.09.08.1 must be upgradeable without:

- deleting MainData,
- re-registering all users,
- changing the public Web App URL merely because source changed,
- recreating report folders/templates unless repair is actually required.

## 6. Event migration policy for P1

The EventID migration must:

- detect whether the target schema already exists;
- add new identity/metadata structure without reordering legacy values unexpectedly;
- backfill exactly one stable ID per existing event;
- preserve original 30-column business values;
- be safe when interrupted/re-run;
- report duplicate/malformed IDs rather than silently overwriting them;
- avoid depending on current physical row numbers after completion.

No EventID implementation is authorized in P0; this section defines its gate.

## 7. Release flow

```text
Issue / approved scope
        ↓
feature branch
        ↓
implementation + tests
        ↓
PR
        ↓
review / gates
        ↓
merge to main
        ↓
tag/release
        ↓
Apps Script deployment candidate
        ↓
migration dry run (when applicable)
        ↓
deployment / smoke verification
```

## 8. Deployment release rule

Saving code in Apps Script is not equivalent to updating the deployed Web App.

For a production Web App release, deployment must explicitly publish a new deployment version while preserving the existing URL when that is the intended operational model.

## 9. Release notes

Every release affecting persistent data or user-visible workflow must state:

- AppVersion
- SchemaVersion
- included Gap IDs
- migration required: yes/no
- rollback constraints
- user-visible changes
- known limitations

## 10. Branching

- `main`: releasable history
- short-lived branches per phase/concern
- no direct modernization feature work on the frozen baseline commit
- PR required before Group A/B work enters main

## 11. Secrets and environment identifiers

Do not commit production credentials, API keys, Spreadsheet IDs, Folder IDs or deployment-specific secrets.

Examples/templates may use placeholders only.

## 12. Rollback

Code rollback and data rollback are separate.

A code rollback must not assume a migrated Sheet automatically returns to its old schema.

Therefore migrations should maintain backward compatibility for at least the release transition window whenever practical.
