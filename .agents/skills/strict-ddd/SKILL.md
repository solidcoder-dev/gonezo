---
name: strict-ddd
description: Use for Kotlin/core domain, application, bounded contexts, aggregates, value objects, repositories, domain events, and invariants.
---

# Strict DDD

## Purpose

Protect Gonezo's domain model from framework leakage, cross-context coupling, and misplaced business rules.

## Rules

- Domain packages must contain business meaning, not technical plumbing.
- Domain must not import Android, Capacitor, SQLite, Spring, Flyway, React, filesystem APIs, or infrastructure classes.
- Bounded contexts must not depend on another context's internals.
- Aggregates enforce invariants through methods, not public mutable state.
- Value objects must validate meaningful concepts such as money, IDs, currencies, recurrence, dates, and statuses.
- Repositories are domain/application ports, not places for business logic.
- Expected business failures should use explicit results or domain errors, not vague generic exceptions.

## Gonezo bounded contexts

- `ledger`: financial facts, accounts, transactions, balances, transfer coherence.
- `taxonomy`: categories, tags, and assignments; no balances or transaction creation.
- `recurrence/scheduling`: scheduled and recurring movement models and due processing.
- `expected`: expected movement model and validation lifecycle.
- `application/query`: composed read models across modules.
- `application/orchestration`: cross-context workflows, cleanup, imports, retries, and consistency.
- `domain/shared`: small shared kernel such as `Money`, `CurrencyCode`, and `DomainEvent`.

## Decision rules

- If code enforces an invariant, place it in domain.
- If code coordinates a user workflow or multiple contexts, place it in application/orchestration.
- If code persists, parses, talks to Android, or calls external APIs, place it in infrastructure.
- If code reads across contexts for a dashboard/search/list, use a query/read model instead of changing aggregates.

## Forbidden

- Ledger owning category/tag identity.
- Taxonomy creating or voiding transactions.
- Cross-context cleanup inside a single context repository.
- Hidden writes inside read/list/query methods.
- Infrastructure DTOs leaking into aggregates.

## Verification

- Run `cd core && ./gradlew test checkLayerBoundaries`.
- Check imports manually when touching domain/application packages.
