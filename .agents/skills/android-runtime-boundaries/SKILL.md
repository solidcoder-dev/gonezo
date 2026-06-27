---
name: android-runtime-boundaries
description: Use when a task touches Android, Capacitor, platform folders, web fallback behavior, iOS scope, native storage, or runtime-specific code.
---

# Android Runtime Boundaries

## Purpose

Keep development focused on the current production runtime while preserving future web/iOS options without accidental scope creep.

## Rules

- Android is the current product runtime.
- Web adapter is for tests and future runtime support.
- iOS is out of scope unless the user explicitly asks for it.
- Do not optimize product behavior around the web fake when Android behavior is the real target.
- Do not touch iOS files to mirror Android changes unless the task asks for cross-platform work.
- Platform detection must be explicit and must provide safe fallbacks.

## Native/web parity

- Shared TypeScript ports should stay stable across Android and web fake.
- Web fake must be deterministic, resettable, and close enough for tests.
- Runtime-specific differences must be explicit, documented, and tested where they affect behavior.

## Verification

- For native changes, check Android plugin and Kotlin/Android infrastructure path.
- For shared port changes, update both Android path and web fake or document intentional non-parity.
- Run `cd app && npm run android:sync` after relevant native-facing frontend changes when possible.
