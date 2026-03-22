# Core Modules

Current package structure:

- `com.gonezo.ledger.domain|application|infrastructure`
- `com.gonezo.taxonomy.domain|application|infrastructure`
- `com.gonezo.application.query`
- `com.gonezo.application.orchestration`
- `com.gonezo.infrastructure` (technical infrastructure)

Layer intent:

- `ledger/*`: financial core, independent.
- `taxonomy/*`: classification core, independent.
- `application/query`: composed read models across modules.
- `application/orchestration`: coordination workflows and retries.
- `infrastructure/*`: adapters, persistence, scheduler/event plumbing.
