# Gonezo Agent Instructions

## Project facts

- Gonezo is a React + TypeScript + Vite + Capacitor app with Kotlin/JVM core logic and Android as the current product runtime.
- The current product path is Android. Web is a test/future runtime. iOS is out of scope unless the user explicitly asks for it.
- Use repository docs as contracts: `docs/frontend-architecture.md`, `docs/ledger-domain.md`, `docs/taxonomy-domain.md`, `docs/movements-backup-import.md`, `docs/mobills-import.md`, and `core/README.md`.
- Preserve the existing `app/src` structure and the Kotlin/core bounded-context structure.

## Always-on rules

- Inspect nearby files before creating, moving, or editing code.
- Prefer the smallest correct change that preserves behavior and public contracts.
- Do not create new top-level folders unless the user explicitly asks for a structural migration.
- Do not touch web/iOS runtime behavior unless the task asks for it or a shared contract requires it.
- Do not add comments by default. Make code self-explanatory through names, types, cohesive structure, and readable flow.
- Do not weaken, delete, or bypass architecture checks, structure checks, linting, type checks, or tests to make a change pass.
- Do not add placeholder TODOs, fake implementations, unused abstractions, or speculative infrastructure.
- Be transparent about checks that were not run.

## Skill routing

Before editing, load the relevant skills from `.agents/skills`.

- Any code change: `project-structure-contract`, `self-explanatory-code`, `pragmatic-refactoring`, `testing-strategy`, `agent-working-agreement`.
- Any architecture, folder, dependency, or module change: `project-structure-contract`, `architecture-tests`, `repo-hygiene`.
- Kotlin/core/domain/application/infrastructure change: `strict-ddd`, `ports-and-adapters`, `architecture-tests`.
- Frontend React/TypeScript change: `frontend-architecture`, `required-provided-capabilities`, `self-explanatory-code`.
- Capacitor/CorePlugin/Android bridge/native adapter change: `native-bridge-contracts`, `android-runtime-boundaries`, `adapter-contracts`.
- Money, account, ledger, transaction, transfer, category, tag, split, lifecycle, or analytics change: `financial-domain-rules`.
- Scheduled, recurring, expected, posted, due processing, recurrence, or date/time change: `scheduling-expected-posted-rules`.
- Backup, Mobills, Excel, CSV/TSV/JSON import/export, restore, migration, parser, fingerprint, or soft-delete change: `import-backup-migration-rules`.
- Test-only change: `testing-strategy`, plus the domain skill for the behavior under test.
- Cleanup/refactor change: `pragmatic-refactoring`, `project-structure-contract`, `testing-strategy`.

## Pre-edit checklist

1. Identify the affected runtime: Android, frontend, core, imports, backup, tests, or docs.
2. Identify the affected bounded context: ledger, taxonomy, recurrence/scheduling, expected, imports/backup, analytics, account, preferences, or shared.
3. Load the required skills from the routing rules above.
4. Inspect nearby files and follow the closest existing pattern.
5. Decide whether the change is domain, application, infrastructure, UI, persistence, native bridge, or test code.
6. Preserve existing public contracts unless the user explicitly asks for a breaking change.

## Verification commands

Run the narrowest useful checks after edits. If unavailable, say so.

Frontend/app:

```bash
cd app
npm run check:structure
npm run lint
npm test
npm run build
```

Android bridge sync when native behavior changes:

```bash
cd app
npm run android:sync
```

Kotlin/core:

```bash
cd core
./gradlew test checkLayerBoundaries
```

## Import/upsert non-negotiables

- Treat stable row IDs as the primary identity whenever they are present.
- Do not match an incoming row by natural key before checking its stable ID.
- Preserve the Excel-provided `soft_delete` value exactly; never default an existing soft-deleted row back to active during import.
- Add or update a regression test covering an existing soft-deleted Excel row re-imported with the same stable ID.

## Final response requirements

- Summarize changed files and why.
- List checks run and checks not run.
- Mention any risk, migration effect, or contract change.
