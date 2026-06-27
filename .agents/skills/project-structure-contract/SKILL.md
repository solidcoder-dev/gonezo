---
name: project-structure-contract
description: Use for any file creation, movement, folder choice, module layout, or architecture-preserving edit in Gonezo.
---

# Project Structure Contract

## Purpose

Preserve Gonezo's declared architecture by placing code in the correct folder, respecting layer/context ownership, and avoiding new structural patterns unless explicitly requested.

## Rules

- Must inspect nearby folders and existing naming before creating or moving files.
- Must place new code in the closest existing folder that matches its responsibility.
- Must not create new top-level folders unless the user explicitly requests a structural migration.
- Must not duplicate an existing structure with a slightly different name.
- Must not mix domain, application, infrastructure, persistence, native bridge, and UI concerns in one file.
- Prefer consistency with the current repo over ideal architecture, unless the current structure violates an explicit rule.

## Gonezo active structure

- `app/src` is the active frontend source root.
- `app/src` top-level entries are intentionally restricted by `app/scripts/check-src-structure.mjs`.
- Current frontend contexts include `account`, `core`, `expected`, `imports`, `ledger`, `movements`, `scheduling`, `shared`, `taxonomy`, `transactions`, and `workspace`.
- Current frontend layer folders are normally `application`, `domain`, `infrastructure`, and `ui`, with `shared/{domain,testing,ui,utils}`.
- `core/src/main/kotlin` is the pure Kotlin core source root.
- Android runtime integration lives outside the pure core in `platforms/android/**` and `app/android/**`.

## Placement rules

- Business invariants, entities, value objects, and domain services go in domain.
- Use-case orchestration, commands, queries, and cross-context workflows go in application.
- Database, file system, native API, Capacitor, Android, parser, external integration, and adapter code go in infrastructure.
- React rendering goes in UI/presentation folders.
- Page-level composition belongs in page/application shell files, not low-level UI components.
- DTO conversion belongs at boundaries, not inside domain entities or presentational components.
- Cross-context coordination belongs in application/orchestration, not inside one bounded context.

## Frontend rules

- UI components must not import core adapters, native plugins, infrastructure, persistence, or concrete services directly.
- Views receive view models and callbacks, not raw backend/native DTOs.
- Pages may compose capabilities but must not become business-logic containers.
- Shared UI must not depend on feature-specific logic.

## Kotlin/core rules

- Domain code must not import Android, SQLite, Capacitor, React, filesystem APIs, Spring, Flyway, or framework-specific infrastructure.
- Application code may depend on domain models and ports, but not concrete infrastructure.
- Infrastructure implements ports and translates external data into application/domain models.
- Persistence-specific rows/entities must not leak into domain logic.
- Shared kernel must remain small, stable, and genuinely cross-context.

## Verification

- Check that every new file is in an existing appropriate folder.
- Check that no forbidden imports were introduced.
- Run `cd app && npm run check:structure` for frontend structure edits.
- Run `cd core && ./gradlew checkLayerBoundaries` for Kotlin/core boundary-sensitive edits.
