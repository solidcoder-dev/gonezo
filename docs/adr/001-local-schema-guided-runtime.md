# ADR 001: Local schema-guided interpretation runtime

## Status

Accepted. The Android runtime now uses a locally provisioned LiteRT-LM adapter behind the portable runtime port.

## Context

The interpretation capability must execute locally, return a structured result, and constrain output to the consumer-provided specification. The generic module cannot depend on Gonezo, Android, JNI, or a particular model runtime.

## Decision

Keep `StructuredGenerationRuntime` as the only runtime port. Android owns the concrete local adapter and loads a pinned LiteRT-LM model from private storage. The portable core continues to depend only on the runtime port and JSON contract, not on the model runtime itself.

## Evidence

The repository now pins the Android LiteRT-LM dependency in the app module, stages the interpretation model from a local artifact, and validates the model by size and SHA-256 before copying it into private storage. The portable prompt compiler produces strict JSON instructions and the portable decoder rejects malformed output.

No device measurement is claimed in the repository yet beyond the automated unit and build checks in this workspace.

## Consequences

- Gonezo compiles the interpretation specification and maps the generic result into its own draft.
- The generic core remains reusable and has no financial vocabulary.
- A native engine and model are pinned, checksum-verified, explicitly provisioned, and tested before the local interpreter runs in Android.
- No rule-based production fallback is allowed.
