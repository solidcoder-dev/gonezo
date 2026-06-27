---
name: scheduling-expected-posted-rules
description: Use for scheduled movements, recurring movements, expected movements, posted transactions, recurrence projection, due processing, dates, and time zones.
---

# Scheduling, Expected, and Posted Rules

## Purpose

Keep Scheduled/Recurring, Expected, and Posted concepts separate and deterministic.

## Concept boundaries

- Scheduled/Recurring describes future rules or one-shot planned movements.
- Expected is a user-validation/workflow state before posting.
- Posted is a real ledger transaction.
- Do not collapse these into one generic movement state without explicit transitions.

## Transition rules

- Creating a schedule must not automatically become a posted transaction unless due processing explicitly does so.
- Processing due movements must be idempotent for the same occurrence.
- Resolving an expected movement into ledger must preserve account, amount, type, date, and taxonomy intent where applicable.
- Dismissing expected movement is not the same as voiding a posted transaction.
- Deactivating a schedule is not the same as deleting historical posted transactions.

## Recurrence rules

- Recurrence projection must be deterministic and heavily tested.
- Duplicate expected movements for the same schedule occurrence must be prevented.
- One-shot scheduled movement and recurring movement are related but distinct; preserve origin/kind fields.

## Date/time rules

- Use explicit types and conversion points for `Instant`, local date, ISO strings, due date, and `zoneId`.
- UI display date and persistence instant/local-date semantics must not be mixed casually.
- Recurrence must define whether it operates in local date or instant semantics.

## Verification

- Add tests for edge dates, month boundaries, time zones, due processing, duplicate prevention, and schedule deactivation.
- Run core tests when changing recurrence/expected/scheduling behavior.
