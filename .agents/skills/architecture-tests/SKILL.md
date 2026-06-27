---
name: architecture-tests
description: Use when changing structure, dependencies, imports, Gradle scripts, ESLint rules, architecture checks, or CI quality gates.
---

# Architecture Tests

## Purpose

Turn architecture rules into executable checks so agents cannot rely on memory or preference.

## Rules

- Must not weaken, delete, skip, or bypass architecture checks unless the user explicitly asks.
- Must add or strengthen checks when a new architectural rule is introduced.
- Must keep checks deterministic and fast enough to run during normal development.
- Prefer scripts/tests over documentation-only rules for dependency boundaries.

## Gonezo checks to preserve

- Frontend: `app/scripts/check-src-structure.mjs` enforces allowed `app/src` top-level and layer directories.
- Frontend: `npm run check:structure`, `npm run lint`, `npm test`, `npm run build` are the normal checks.
- Kotlin/core: `./gradlew test checkLayerBoundaries` should protect framework/platform imports and bounded-context leaks.
- Kotlin/core: `checkLayerBoundaries` must keep domain/application free of Android, Capacitor, and framework dependencies.

## Add checks for

- UI importing core adapters, native plugins, or infrastructure directly.
- Domain importing other bounded contexts directly.
- Ledger defining taxonomy-owned identities.
- Native bridge method drift between TypeScript ports, Capacitor plugin, Java handlers, and Kotlin core.
- Backup/import schema changes without tests.
- Web fake behavior diverging silently from Android production behavior.

## Verification

- Run the relevant checks after edits.
- If checks cannot run, state why and what should be run locally.
- Never claim a check passed unless it actually ran.
