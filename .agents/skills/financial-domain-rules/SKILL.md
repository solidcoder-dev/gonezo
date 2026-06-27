---
name: financial-domain-rules
description: Use for ledger, accounts, transactions, money, currencies, balances, FX transfers, splits/items, taxonomy, categories, tags, analytics, and lifecycle rules.
---

# Financial Domain Rules

## Purpose

Protect Gonezo's financial correctness, ledger/taxonomy separation, and money precision.

## Money and currency

- Never use floating-point arithmetic for financial values.
- Preserve money precision across TypeScript, Java, Kotlin, SQLite, JSON, backups, and imports.
- Use explicit currency values and validate account/transaction currency compatibility.
- Rounding rules must be explicit and tested.

## Ledger rules

- Ledger records real economic facts: accounts, transactions, amounts, dates, balances.
- Ledger does not own category/tag identity.
- Ledger does not model budgets, debts, settlements, taxonomy, or advanced analytics.
- Archived accounts do not accept new transactions.
- Voided transactions do not affect balance.
- Opening balance is represented as an income/expense transaction, not mutable account balance.

## Transfer and FX rules

- Same-currency transfers keep source/destination amounts coherent.
- Different-currency transfers validate source amount, destination amount, currencies, and exchange rate centrally.
- Exchange rate must be greater than zero when present.
- Linked transfer transactions must remain reciprocal.
- Voiding one side of a linked transfer must handle the linked side consistently.

## Split/item rules

- Transaction item amount must be greater than zero.
- Item currency must match the parent transaction.
- Draft transaction items may not exceed total amount.
- Posting with items requires item sum to equal transaction amount.
- UI must not allow applying a split when attributed amounts do not balance.

## Taxonomy rules

- Taxonomy manages categories, tags, and assignments only.
- Category names are unique by `appliesTo` after normalization.
- Tag names are globally unique after normalization.
- Only active categories/tags can be assigned.
- A transaction has at most one active category assignment.
- A transaction can have multiple tags.
- Transfers may accept tags but are not normal category expenses/income unless explicitly allowed.

## Analytics/read models

- Analytics must compose read models and must not mutate ledger/taxonomy.
- Search facets should be scoped to the current movement/account scope.

## Verification

- Add unit tests for money, FX, split totals, lifecycle, and taxonomy assignment rules.
- Run frontend and core tests for flows crossing UI and core.
