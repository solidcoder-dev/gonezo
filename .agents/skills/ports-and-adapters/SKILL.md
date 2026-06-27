---
name: ports-and-adapters
description: Use when adding repositories, services, native adapters, persistence adapters, parser adapters, query gateways, or external integrations.
---

# Ports and Adapters

## Purpose

Keep business logic independent from UI, native plugins, storage, external files, and technical frameworks.

## Rules

- Business/application logic depends on ports, not concrete infrastructure.
- Infrastructure implements ports and maps external data into internal models.
- Native APIs, SQLite, file parsers, Capacitor plugins, and external integrations stay behind adapters.
- Adapters should be thin; they translate, validate boundary input, call the appropriate use case, and map the result back.
- Do not put business rules inside repositories, native plugin handlers, parser classes, or UI components.

## Gonezo adapter boundaries

- Frontend `CorePort` is a broad facade; prefer smaller capability ports for consumers.
- `CoreAdapter` must not grow into the place where all domain decisions happen.
- Android `CorePlugin` is transport/bridge code, not a business service.
- Web adapter is a fake/future runtime and should stay behaviorally close to Android.
- Import parsers are infrastructure; import orchestration belongs to application services.

## Interface segregation

- Expose the narrowest port a component or service needs.
- Avoid passing full `CorePort` into components when a smaller `LedgerPort`, `TaxonomyPort`, or import port is enough.
- Split broad adapters by capability once they become routing hubs.

## Verification

- Check dependency direction: UI/infrastructure -> application/domain, never the reverse.
- Check each new external dependency has a port boundary.
- Add contract tests for important adapters.
