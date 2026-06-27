---
name: frontend-architecture
description: Use for React/TypeScript frontend changes in app/src, especially components, hooks, pages, view models, routing, forms, state, and UX states.
---

# Frontend Architecture

## Purpose

Keep the React frontend organized by user capabilities with clear contracts, view models, and separation between rendering and orchestration.

## Rules

- Model frontend by user capabilities, not by backend internals.
- Views must not call `core.*`, application hooks, native plugins, concrete adapters, or infrastructure directly.
- Views receive `required` data and expose `provided` commands/events.
- Application hooks/components coordinate state, commands, dependency calls, and mapping.
- Pages compose capabilities; they should not accumulate business workflow logic.
- Convert backend/native DTOs into UI-specific view models before rendering.
- Keep state as local as possible; lift it only for real cross-capability coordination.

## Gonezo conventions

- Page view contract: `required.screen`, `required.toast`, `required.sections`, `provided.toast.commands`.
- Capability contract: `required.context`, `required.config`, `provided.events`.
- Internal view contract: `required.state`, `required.status`, `provided.commands`.
- Sibling capabilities coordinate via `provided.events` from the emitter and `required.config` on the receiver.
- `account/ui/*` and `transactions/ui/*` consume contracts and view models, not raw core types.
- Movement search facets must be scoped to the current account/movement context, not global taxonomy.

## UI states

- Every async flow must have loading, empty, error, success, and partial-success behavior.
- Missing native capabilities or failed plugin calls must degrade gracefully.
- Toasts are for transient feedback, not blocking critical information.
- Forms should separate raw input, validation, derived values, submit state, and backend errors.

## Verification

- Check no `ui/**` file imports application hooks or core infrastructure.
- Check new components use existing design patterns and do not create one-off UI structures.
- Run `cd app && npm run check:structure && npm run lint && npm test` when frontend behavior changes.
