# Application backup architecture

Gonezo has two separate transfer capabilities:

- Movements Import is a merge-oriented transfer of accounts, taxonomy, and posted movements. Existing movement IDs are skipped.
- Application Backup is a target-state restore of the user's portable functional state. It uses a readable JSON document and validates the complete document before applying it.

## Portable document

The application backup root is:

```json
{
  "format": "gonezo-backup",
  "formatVersion": 1,
  "createdAt": "2026-01-01T00:00:00Z",
  "sections": {
    "taxonomy": { "version": 1, "data": {} },
    "ledger": { "version": 1, "data": {} },
    "recurrence": { "version": 1, "data": {} },
    "expected": { "version": 1, "data": {} },
    "sharing": { "version": 1, "data": {} },
    "analytics": { "version": 1, "data": {} },
    "preferences": { "version": 1, "data": {} }
  }
}
```

Sections are independently versioned. The current dependency graph is:

```text
taxonomy
  -> ledger
  -> recurrence
  -> expected
  -> sharing
ledger -> preferences
ledger -> analytics
```

The order is resolved from declarations and cycles fail explicitly. Sharing owns people, posted shares, recurring plans, planned shares, participants, and their explicit references; analytics exclusions are portable user decisions, while balances and other reports are derived.

## State classification

| Classification | Gonezo examples | Backup policy |
| --- | --- | --- |
| PORTABLE | accounts, taxonomy, posted movements, recurring and expected movements, sharing, analytics exclusions, default account | Export and restore with stable IDs and references |
| DERIVED | balances, summaries, recurrence projections, usage counts, `expected_posting_attempts` | Recompute or recreate from source state; posting idempotency is runtime bookkeeping |
| DEVICE_LOCAL | Android URIs, database paths, runtime configuration | Never export |
| EPHEMERAL | `mobills_import_fingerprints`, `recurrence_outbox`, `workflow_tx_categorization`, UI navigation, caches | These support import deduplication, delivery, workflow/runtime processing, or presentation only |

Adding a persisted user-owned feature requires classifying it, adding it to an owned section when portable, validating its references, and adding round-trip and canonical export tests. Only the affected section version should change when possible.
