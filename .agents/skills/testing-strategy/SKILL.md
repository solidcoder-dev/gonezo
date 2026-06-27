---
name: testing-strategy
description: Use for adding or updating tests, choosing test level, regression coverage, contract tests, architecture checks, and verification commands.
---

# Testing Strategy

## Purpose

Protect business behavior with the right level of tests and clear verification.

## Rules

- Add tests near the behavior being changed.
- Prefer fast domain unit tests for pure rules.
- Use application-service tests for orchestration through fake ports.
- Use adapter/contract tests for native, web, persistence, parser, and bridge behavior.
- Use frontend component tests for user-visible behavior, not implementation details.
- Add a regression test for every fixed bug in imports, recurrence, money, bridge mapping, lifecycle, or upsert logic.
- Do not overuse snapshots for logic-heavy behavior; use explicit assertions.

## High-value Gonezo tests

- Money precision, splits, FX transfer coherence, linked transfer voiding.
- Recurrence projection, due processing, duplicate expected prevention, date/time boundaries.
- Backup schema version compatibility and idempotency.
- Mobills duplicate policy and malformed row handling.
- Excel stable ID/soft-delete re-import behavior.
- TypeScript/Java/Kotlin bridge DTO parity.
- Frontend required/provided event coordination and loading/error/partial-success UI.
- Architecture boundary checks.

## Test data

- Use readable builders or fixtures for accounts, transactions, categories, tags, schedules, expected movements, and imports.
- Keep fixtures small and intention-revealing.
- Prefer fake clocks and ID generators for deterministic tests.

## Verification commands

Frontend:

```bash
cd app
npm run check:structure
npm run lint
npm test
npm run build
```

Core:

```bash
cd core
./gradlew test checkLayerBoundaries
```

## Final response

State exactly which checks ran and which did not. Never claim unrun checks passed.
