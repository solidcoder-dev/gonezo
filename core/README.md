# Core Modules

Current source root:

- `core/src/main/kotlin`
- `core/src/main/resources/db/migration`
- `core/src/test/kotlin`

Generated Gradle output is not source and must stay untracked:

- `core/build/`
- `core/bin/`

Current package structure:

- `com.gonezo.ledger.domain|application|infrastructure`
- `com.gonezo.taxonomy.domain|application|infrastructure`
- `com.gonezo.recurrence.domain|application|infrastructure`
- `com.gonezo.expected.domain|application|infrastructure`
- `com.gonezo.application.query`
- `com.gonezo.application.orchestration`
- `com.gonezo.infrastructure` (technical infrastructure)
- `com.gonezo.domain.shared` (shared kernel)

Layer intent:

- `ledger/*`: financial core, independent.
- `taxonomy/*`: classification core, independent.
- `recurrence/*`: scheduled/recurring movement model and outbox.
- `expected/*`: expected movement model.
- `domain/shared`: stable shared kernel (`Money`, `CurrencyCode`, `DomainEvent`).
- `application/query`: composed read models across modules.
- `application/orchestration`: coordination workflows and retries.
- `infrastructure/*`: adapters, persistence, scheduler/event plumbing.

DDD boundary rules:

- Domain packages must not import other bounded contexts.
- `Ledger` does not own category/tag identity; those belong to `Taxonomy`.
- Cross-context cleanup belongs in orchestration workflows, not context repositories.
- Multi-write local flows use `ConsistencyBoundary` so the application layer owns consistency without depending on a concrete transaction technology.

Recurring expected posting is implemented by `application/orchestration/PostExpectedMovementWorkflow`.
It owns one consistency boundary for ledger, taxonomy, expected, recurrence, sharing, and posting
idempotency. Android maps the Capacitor payload to that workflow. Recurrence projection uses
`ExpectedOccurrenceFactory`; recurring sharing is stored as a reusable plan and instantiated as an
independent planned share for each expected occurrence before materialization into a final share.

Android runtime integration lives outside the pure core in:

- `platforms/android/infrastructure/src/main/java/com/gonezo/multiplatform/core`
- `app/android/app/src/main/java/com/gonezo/multiplatform/plugins/CorePlugin.java`
