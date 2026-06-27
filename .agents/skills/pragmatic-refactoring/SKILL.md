---
name: pragmatic-refactoring
description: Use for refactors, cleanup, large files, extraction, naming, simplification, SOLID, Fowler-style improvements, and reducing god objects without over-engineering.
---

# Pragmatic Refactoring

## Purpose

Improve code quality with Martin Fowler-style intention-revealing refactoring, while staying pragmatic and avoiding excessive micro-functions.

## Rules

- Preserve behavior first; improve structure second.
- Prefer small, safe, buildable steps.
- Refactor around the requested change unless the user asks for broader cleanup.
- Avoid excessive tiny functions when a slightly larger cohesive function is easier to read.
- Split code when responsibilities differ, not just because a function is long.
- Prefer names, extracted concepts, and clear types over comments.
- Reject abstractions that cost more than they protect.
- Remove accidental duplication; tolerate deliberate duplication when abstraction would hide important domain differences.

## When to split

- A file/class mixes unrelated bounded contexts.
- A function mixes validation, orchestration, mapping, persistence, and rendering.
- An adapter becomes a large routing hub.
- A page owns unrelated capability states and effects.
- A type forces consumers to depend on many methods they do not use.

## When not to split

- The code is cohesive and read top-to-bottom.
- Extraction would hide simple logic behind vague helper names.
- The helper would have one caller and no clear domain concept.
- The abstraction is speculative.

## Verification

- Run tests covering the behavior before and after when practical.
- Summarize behavior preserved and structure changed.
- Keep public contracts stable unless explicitly requested.
