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

Layer intent:

- `ledger/*`: financial core, independent.
- `taxonomy/*`: classification core, independent.
- `recurrence/*`: scheduled/recurring movement model and outbox.
- `expected/*`: expected movement model.
- `application/query`: composed read models across modules.
- `application/orchestration`: coordination workflows and retries.
- `infrastructure/*`: adapters, persistence, scheduler/event plumbing.

Android runtime integration lives outside the pure core in:

- `platforms/android/infrastructure/src/main/java/com/gonezo/multiplatform/core`
- `app/android/app/src/main/java/com/gonezo/multiplatform/plugins/CorePlugin.java`
