---
name: required-provided-capabilities
description: Use when designing or editing Gonezo frontend capability contracts, page contracts, view contracts, slots, callbacks, and feature composition.
---

# Required / Provided Capabilities

## Purpose

Make frontend feature boundaries explicit so components are reusable, testable, and decoupled.

## Rules

- Use `required` for data, dependencies, context, configuration, and status the component needs.
- Use `provided` for commands, callbacks, events, and effects the component exposes to its parent.
- Do not let child components import what should be passed through `required`.
- Do not let sibling capabilities talk directly; route coordination through parent composition using `provided.events` and `required.config`.
- Prefer view models over raw DTOs inside `required.state`.

## Contract shapes

- Page view: `required.screen`, `required.toast`, `required.sections`; `provided.toast.commands`.
- Capability component: `required.context`, `required.config`; `provided.events` when it emits useful changes.
- Internal view: `required.state`, `required.status`; `provided.commands`.

## Allowed

- A transaction entry capability emits `onRecorded`.
- A movements list receives a `refreshSignal` through config.
- A view receives `isSubmitting`, field values, validation messages, and command callbacks.

## Forbidden

- A view importing `CoreAdapter`.
- A presentational component calling an application hook.
- Passing a full `CorePort` to a low-level input component.
- Sharing mutable page state directly between sibling capabilities.

## Verification

- Check prop names communicate responsibility.
- Check `required` and `provided` are stable enough for tests.
- Add/update component tests around user-visible behavior.
