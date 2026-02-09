
frontend requirements and structure (pwa)

architecture

- ddd layering:
- presentation/ for ui (pages, components, layout).
- application/ for hooks/services (state, orchestration, request state).
- domain/ for pure types/entities/value objects.
- infrastructure/ for api clients, local db, sync, store.
- strict component-oriented programming: each component has clear inputs/outputs and minimal side effects.
- pages live in presentation/pages and aggregate components + hooks.
- state store lives in infrastructure/store (use a modern lightweight store, e.g., zustand).

tech stack

- vite + react + typescript.
- react router for navigation.
- bootstrap 5 for layout and responsive ui.
- effect-ts for all asynchronous logic, including api calls, local db operations, and orchestration in hooks.

pwa

- vite pwa plugin.
- network-first caching strategy by default.
- caching strategy should be configurable via environment variables.
- api base url from env.

offline-first and sync

- local storage using dexie (indexeddb).
- offline read support (cache-first in local db).
- sync engine in infrastructure/sync/.
- conflict strategy is pluggable; chosen by env config.

api requests

- must implement request states: initial, pending, failure, success.
- all hooks should expose that state and a run() trigger.
- api layer should isolate http and error mapping.
- effect-ts should be the primary primitive used in request flows (i.e., effect.effect boundaries in hooks and api).

testing

- every component should be unit-tested with mocked api responses.
- every page should be tested for its core rendering.
- use vitest + testing library.
- tests live alongside components/pages.

responsive ui

- mobile-first design.
- bootstrap grid and utilities for layout.
- keep consistent typography and spacing.

conventions

- presentation/pages → route-level components.
- presentation/components → reusable ui blocks.
- presentation/layout → layouts and shells.
- application/hooks → stateful logic, api orchestration.
- infrastructure/api → api clients, fetch/effect wrappers.
- infrastructure/db → indexeddb/dexie repositories.
- infrastructure/sync → sync engine and conflict resolution.
- domain/types → strictly typed domain models.
