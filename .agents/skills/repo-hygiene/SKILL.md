---
name: repo-hygiene
description: Use for README/docs, generated files, migration status, active vs transitional folders, scripts, dependencies, security/logging, and repository cleanliness.
---

# Repo Hygiene

## Purpose

Keep Gonezo easy to navigate, build, and maintain.

## Rules

- Keep generated build output, IDE files, and accidental artifacts out of source control unless explicitly justified.
- Keep root README as the entry point for setup, architecture, commands, runtime status, and verification.
- Separate current architecture from future/planned architecture.
- Treat architecture/domain docs as contracts when they describe current behavior.
- Document active, transitional, legacy, and future folders clearly.
- Do not add dependencies unless they solve a real recurring problem and do not duplicate existing project capabilities.
- Do not log sensitive financial data.
- Do not expose secrets or private user data in logs, errors, tests, or fixtures.

## Gonezo-specific hygiene

- Root contains `app`, `apps`, `core`, `design`, `docs`, and `platforms`; avoid moving runtime code between these without an explicit migration task.
- `app/` is the active app path unless docs/tasks say otherwise.
- `apps/` and future runtime folders should not receive product behavior unless the task explicitly requests migration.
- Android is active product runtime; web/iOS are not product targets by default.

## Documentation rules

- Update docs when changing architecture, public contracts, import schema, backup schema, or runtime scope.
- Do not create broad documentation churn for local implementation-only changes.
- Use ADRs for important decisions with alternatives and consequences.

## Verification

- Check git status for generated/unwanted files before finalizing.
- Run dependency/build checks if dependencies changed.
