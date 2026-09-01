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
    "taxonomy": { "version": 1, "data": { "categories": [], "tags": [] } },
    "ledger": { "version": 1, "data": { "accounts": [], "postedMovements": [] } },
    "recurrence": { "version": 1, "data": { "movements": [], "occurrences": [] } },
    "expected": { "version": 1, "data": { "movements": [] } },
    "sharing": { "version": 1, "data": { "persons": [], "expenseShares": [], "recurringSharingPlans": [], "plannedExpenseShares": [] } },
    "analytics": { "version": 1, "data": { "exclusions": [] } },
    "preferences": { "version": 1, "data": { "defaultAccountId": null } }
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

## Compatibility policy

Application backup contracts describe portable semantics; infrastructure owns JSON conversion. The Application coordinator imports and exports technology-neutral documents, while the JSON root codec resolves explicit historical format descriptors.

Root format versions change when the required portable section set, root metadata semantics, or root structure changes. Section versions change independently when only one section's representation changes. Therefore a Sharing schema change can move from `sharing v1` to `sharing v2` while root `formatVersion` remains `1`; adding the future Budgets feature changes the root composition from v1 to v2 and introduces `budgets v1`.

```text
v1: taxonomy, ledger, recurrence, expected, sharing, analytics, preferences
v2: taxonomy, ledger, recurrence, expected, sharing, analytics, preferences, budgets
```

Compatibility is strict for complete restore: a new application migrates supported old formats into its current canonical document; an old application rejects newer unsupported root formats and unknown sections; corrupt documents and unsupported section versions are rejected before persistence mutation. Optional sections must be listed explicitly by the root descriptor; absence never implies optionality.

## Canonical section field names

The portable JSON contract uses these names in every runtime:

- ledger posted movements: `postedMovements`
- sharing recurring plans: `recurringSharingPlans`
- sharing planned shares: `plannedExpenseShares`
- posted share source: `transactionId`

The decoder accepts the deprecated names `movements` in the ledger section, `recurringPlans`, `plannedShares`, and `sourceTransactionId` in sharing backups. New exports never emit those aliases. Unknown sections and unsupported section versions are rejected before restore.

## State classification

| Classification | Gonezo examples | Backup policy |
| --- | --- | --- |
| PORTABLE | accounts, taxonomy, posted movements, recurring and expected movements, sharing, analytics exclusions, default account | Export and restore with stable IDs and references |
| DERIVED | balances, summaries, recurrence projections, usage counts, `expected_posting_attempts` | Recompute or recreate from source state; posting idempotency is runtime bookkeeping |
| DEVICE_LOCAL | Android URIs, database paths, runtime configuration | Never export |
| EPHEMERAL | `mobills_import_fingerprints`, `recurrence_outbox`, `workflow_tx_categorization`, UI navigation, caches | These support import deduplication, delivery, workflow/runtime processing, or presentation only |

Adding a persisted user-owned feature requires:

1. Classify it as `PORTABLE`, `DERIVED`, `DEVICE_LOCAL`, or `EPHEMERAL`.
2. If portable, extend its owning section or add a new section.
3. Change only that section version when the contract changes.
4. Add codec/version and reference-validation tests. Root composition is declared by a format descriptor, never inferred from currently registered codecs.
5. Add full round-trip and export-import-export coverage.
6. Update the canonical cross-runtime fixture when the shared contract changes.

The canonical taxonomy contract deliberately has no `transactionTags` array: movement `tagIds` is the single portable source of truth. Decoders may accept that legacy array and ignore it when movement tags are present.
