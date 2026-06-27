---
name: native-bridge-contracts
description: Use for Capacitor CorePlugin, Android bridge handlers, TypeScript ports, Java/Kotlin DTOs, native calls, and plugin error/result mapping.
---

# Native Bridge Contracts

## Purpose

Prevent drift between TypeScript frontend ports, Capacitor plugin methods, Java/Android handlers, Kotlin core services, and returned DTOs.

## Rules

- Every bridge method must have aligned names, inputs, outputs, optional fields, enum values, and error semantics across TS, Java, Kotlin, and JSON.
- `CorePlugin` must stay a thin transport layer: parse input, delegate, map result, return/reject.
- Do not put business rules in plugin handlers.
- Normalize native/domain errors into stable frontend-facing error shapes.
- Preserve Android behavior as the product source of truth unless the task says otherwise.

## DTO parity

- Field names must match exactly unless a mapper documents the translation.
- Optionality must match across TS and Java/Kotlin.
- Money values must preserve precision as strings/decimal-safe values.
- Dates and instants must use explicit ISO/local-date/zone semantics.
- Enums must reject unknown values or map them explicitly.

## Splitting rules

- Split plugin handlers by capability or bounded context when a class becomes a routing hub.
- Keep adapter methods shallow; delegate domain work to application/core services.
- Add bridge contract tests for high-risk areas: imports, money, scheduling, expected, transfers, and taxonomy.

## Verification

- Check TypeScript port, `CoreAdapter`, `CorePlugin`, Android core adapter, and Kotlin use case all agree.
- Run frontend tests and Android/core tests when bridge behavior changes.
- If a method exists in Android but not web fake, document or implement parity.
