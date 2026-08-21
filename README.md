# Gonezo

Gonezo is an Android-first React + TypeScript + Kotlin app.

## Quality Checks

- Fast agent check: `./scripts/verify.sh fast` (local Node/Java tools, no Docker)
- Standard local check: `./scripts/verify.sh standard` (complete local frontend/core checks)
- Full frontend/core check: `./scripts/verify.sh standard`
- Frontend: `./scripts/verify.sh frontend`
- Core: `./scripts/verify.sh core`
- E2E: `./scripts/verify.sh frontend-e2e` (Docker)

Local setup uses Node `22.14.0`, Java `21`, the committed npm lockfile, and the Gradle wrapper. Run `cd app && npm ci` after dependency changes.

## Static Analysis

- ESLint is type-aware and includes JSX accessibility rules.
- `dependency-cruiser` enforces frontend architecture with a baseline for inherited violations.
- Spotless enforces Kotlin and Gradle formatting in the JVM build.
- ArchUnit enforces core layer and bounded-context boundaries.

Docker is currently used only for Chromium E2E. Android SDK/NDK and native clang checks are being continued on a separate future branch.

## Tooling Decision

`detekt` is intentionally deferred for now because there is no stable release aligned with Kotlin 2.3.x in this toolchain. Revisit it when a stable compatible release is available.
