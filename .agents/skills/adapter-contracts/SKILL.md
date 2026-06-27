---
name: adapter-contracts
description: Use when editing CorePort, CoreAdapter, CoreAdapterWeb, query adapters, web fakes, adapter tests, or facade/interface segregation.
---

# Adapter Contracts

## Purpose

Keep adapters narrow, predictable, behaviorally consistent, and testable across native and web/fake runtimes.

## Rules

- Consumers should depend on the narrowest capability port, not a giant facade.
- Split broad adapters when unrelated responsibilities accumulate.
- Adapter methods should translate and delegate, not decide domain behavior.
- Native and web fake implementations must satisfy the same contract unless a difference is explicitly documented.
- Avoid hidden writes inside list/get/query adapter methods.

## Gonezo risks to watch

- `CorePort` can become too broad because it extends many capability ports.
- `CoreAdapter` can become a god adapter if every new method is added there without context splitting.
- Query adapters must not mutate taxonomy, ledger, or scheduling state unexpectedly.
- Analytics/read models should compose reads; they should not change domain state.

## Contract tests

- Define expected behavior at the port level.
- Reuse the same contract expectations for Android/native, web fake, and in-memory implementations when practical.
- Test error cases and empty states, not only success.

## Verification

- Check whether a new method belongs in a smaller port.
- Check web fake/native parity.
- Add tests for adapter behavior when changing public port contracts.
