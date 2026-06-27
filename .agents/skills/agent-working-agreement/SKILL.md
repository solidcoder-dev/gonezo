---
name: agent-working-agreement
description: "Use for every task to control agent behavior: scope, minimal changes, checks, reporting, no placeholders, and failure transparency."
---

# Agent Working Agreement

## Purpose

Make agent behavior predictable, scoped, and honest.

## Rules

- Inspect first, then edit.
- Load relevant skills before changing code.
- Prefer minimal correct changes.
- Keep changes inside the requested runtime, feature, and bounded context.
- Do not invent architecture, files, or workflows when an existing pattern is available.
- Do not add placeholder code, speculative abstractions, or TODO stubs unless explicitly requested.
- Do not weaken tests or checks.
- Do not claim checks passed unless they ran.
- Say clearly what could not be verified.

## Before editing

- Identify affected files and context.
- Identify public contracts that must remain stable.
- Identify tests/checks that should be run.
- Make the smallest safe plan.

## After editing

Report:

- Files changed.
- What changed and why.
- Behavior preserved or changed.
- Tests/checks run.
- Tests/checks not run.
- Risks, migrations, or follow-up only if real.

## Refusal to overreach

- Do not touch unrelated files for style cleanup.
- Do not migrate web/iOS because Android changed.
- Do not redesign a domain because a local adapter needs a fix.
- Do not introduce a dependency for a one-off problem.
