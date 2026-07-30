# Architecture Contracts

## Frontend contexts

Active frontend contexts are `account`, `analytics`, `core`, `expected`, `experiments`, `imports`, `ledger`, `movements`, `scheduling`, `sharing`, `shared`, `taxonomy`, `transactions`, and `workspace`.

Allowed layer shapes are context-specific and are enforced by `app/scripts/check-src-structure.mjs`:

- `account`, `analytics`, `expected`, `experiments`, `scheduling`: `application`, `infrastructure`, `ui`
- `ledger`, `movements`: `application`, `infrastructure`, `ui`
- `sharing`: `application`, `domain`, `infrastructure`, `ui`
- `taxonomy`: `application`, `domain`, `infrastructure`
- `transactions`: `application`, `domain`, `ui`
- `core`: `application`, `infrastructure`
- `imports`: `application`, `domain`, `infrastructure`, `ui`, with `infrastructure/providers/mobills`
- `shared`: `domain`, `testing`, `ui`, `utils`
- `workspace`: `application`, `ui`

`application` components may coordinate same-context `ui` and may use public entry points from other contexts. Public cross-context surfaces are `index.ts`, `*Component.tsx`, `*View.tsx`, `*Page.tsx`, `*Gateway.ts`, `*Port.ts`, and `*.contract.ts`.

## Frontend checks

- `./scripts/verify.sh` is the canonical repo-wide entry point. Use `./scripts/verify.sh frontend` for the frontend gate, `./scripts/verify.sh core` for the JVM gate, and `./scripts/verify.sh build-frontend` or `./scripts/verify.sh health` when you need those parts separately.
- `npm run check` inside `app/` remains a compatibility wrapper over the frontend verifier.
- Verification runs write private logs and summaries under `.reports/verify/`.
- `check-src-structure.mjs` validates top-level entries, allowed context layers, and the special `shared` and `imports` trees.
- `dependency-cruiser` rejects unresolved imports, circular imports, domain/framework leakage, `shared` depending on feature contexts, and cross-context deep imports into internals.
- `solidBoundaries.spec.ts` and the dependency-cruiser fixture tests exercise the same architectural contract against real source patterns.

## Backend contexts

Current backend boundaries are:

- `com.gonezo.domain..` for the main bounded-domain packages
- `com.gonezo.sharing.domain..` for the sharing domain model
- `com.gonezo.application..` for orchestration, query, services, and shared application contracts
- `com.gonezo.infrastructure..` for adapters and persistence
- `dev.solidcoder.interpretation..` for the schema-guided interpretation module

## Backend checks

- `DddBoundaryTest.kt` enforces domain purity, application boundary rules, repository placement, bounded-domain isolation, cycle detection, and the orchestration-only interpretation rule.
- `checkLayerBoundaries` remains the transitional physical guard for `CategoryId` placement, forbidden platform imports, interpretation access, and direct domain dependency checks. It runs from `check` and in CI while it still exists.

## Adding a new context or exception

1. Add the folder to the relevant explicit allowlist or package rule.
2. Add a regression test with a valid and invalid fixture.
3. Update dependency-cruiser, ArchUnit, and any remaining transitional checks together.
4. If an exception is temporary, document the reason and keep it out of the baseline once it is no longer inherited debt.
