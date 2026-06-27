---
name: self-explanatory-code
description: Use for all code changes to avoid default comments and make code understandable through names, types, structure, and readable flow.
---

# Self-Explanatory Code

## Purpose

Keep code readable without relying on comments as a crutch.

## Rules

- Do not add comments by default.
- Make intent clear through names, types, cohesive structure, and straightforward control flow.
- Use comments only when the user explicitly asks or when documenting an unavoidable external constraint that cannot be expressed in code.
- Prefer intention-revealing names over explanatory comments.
- Prefer explicit boundary types over informal prose.
- Remove stale, redundant, or misleading comments when touching nearby code.

## Allowed rare comments

- Explaining a non-obvious external platform limitation.
- Documenting a regulatory, file-format, schema, or compatibility constraint that code cannot make obvious.
- Warning about a migration compatibility rule.

## Forbidden

- Comments that repeat the code.
- Comments used to justify confusing names.
- TODO comments without an explicit user request.
- Large explanatory blocks hiding poor structure.

## Refactoring preference

- Rename before commenting.
- Extract a cohesive helper before explaining a dense expression.
- Introduce a value object or type when primitives hide meaning.
- Keep the flow readable without excessive tiny functions.
