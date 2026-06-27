---
name: import-backup-migration-rules
description: Use for Gonezo backup import/export, Mobills legacy import, Excel import/upsert, CSV/TSV/JSON parsing, schema versions, migrations, fingerprints, and row results.
---

# Import, Backup, and Migration Rules

## Purpose

Keep imports idempotent, recoverable, schema-aware, and outside bounded-context domain logic.

## Boundary rules

- Imports and backups are orchestration/application workflows, not Ledger or Taxonomy domain behavior.
- Parsers and file-format adapters belong in infrastructure.
- Import workflows may coordinate Ledger, Taxonomy, accounts, tags, categories, and assignments through application services.
- Do not let legacy Mobills shape the main domain model.

## Gonezo backup rules

- Native Gonezo backup is the primary restore/migration flow.
- Backup schema changes must be versioned.
- Current backup schema must preserve accounts, categories, tags, posted movements, identifiers, currency, date, description, category, tags, and linked transfers.
- Unsupported or unsafe backup versions must fail explicitly or produce row-level failures.
- Existing movement identity from the backup must be used for idempotency.
- If a movement already exists, mark the row as skipped rather than duplicating it.

## Mobills rules

- Mobills is legacy and must be activated explicitly by UI choice.
- Parser handles UTF-16/UTF-8 and delimiter detection.
- `value < 0` means expense, `value > 0` means income, `value == 0` fails with a stable error.
- `subcategory` is ignored; `category` and tags are preserved, normalized, and deduplicated.
- Duplicate policy must be explicit: `skip`, `fail`, or `import_anyway`.
- Fingerprint table is technical infrastructure and must not couple Ledger and Taxonomy.

## Excel/upsert rules

- Stable row IDs are the primary identity whenever present.
- Do not match by natural key before checking stable ID.
- Preserve the imported `soft_delete` value exactly.
- Never default an existing soft-deleted row back to active during re-import.
- Add/update a regression test for re-importing an existing soft-deleted Excel row with the same stable ID.

## Results and errors

- Imports return per-row statuses: `imported`, `failed`, or `skipped`.
- Errors must use stable `errorCode` plus user-readable `errorMessage`.
- Partial failure behavior must be explicit: what commits, what rolls back, and how UI explains it.

## Verification

- Add tests for duplicate import, stable ID match, soft delete preservation, schema version compatibility, malformed rows, and partial failures.
- Run core/import tests and frontend import tests when changing import UI or contracts.
