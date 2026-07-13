# Schema-Guided Interpretation

## Responsibility

`schema-guided-interpretation` defines the portable Kotlin/JVM contract for interpreting unstructured text from a consumer-provided specification into structured, reviewable results. The module stays neutral: it knows the request, the result, and the runtime port, but it does not know Android, LiteRT-LM, Gonezo-specific finance language, or any particular model artifact.

## Ubiquitous language

- `InterpretationSpec`: the consumer-defined schema to follow.
- `FieldSpec`: one requested field with semantic description, closed type, and optional allowed values.
- `StructuredValue`: typed value candidates used by the contract.
- `FieldInterpretation`: resolved, ambiguous, or missing state for a requested field.
- `InterpretationResult`: result bound to the exact spec id and version used.
- `InterpretationContext`: typed contextual entries supplied by the consumer.

## What it knows

- Unstructured text input.
- Consumer-defined fields, field descriptions, types, allowed values, and context.
- Partial and ambiguous outcomes.
- Confidence and non-technical issues.

## What it does not know

- Gonezo domain concepts such as movement, transaction, account, category, ledger, taxonomy, or composer.
- Audio recording or transcription.
- Android, Capacitor, JNI, C++, Whisper, LiteRT-LM, HTTP, remote execution, persistence, or UI.

## Dependency direction

The allowed direction is:

`gonezo-core -> schema-guided-interpretation`

The reverse dependency is blocked by automated checks.

## Why it is not a Gonezo bounded context

The module models a reusable interpretation contract with neutral language under `dev.solidcoder.interpretation`. Gonezo translates its own concepts at the application boundary instead of sharing financial entities or value objects with the module.

## Current pipeline

The voice path is now entirely local on Android:

`Audio -> Whisper local -> transcript -> OnDeviceInputInterpreter -> StructuredGenerationRuntime -> LiteRtStructuredGenerationRuntime (GPU-only Gemma 3 1B dynamic-int4 QAT) -> strict JSON -> JsonInterpretationResultDecoder -> InterpretationOutcome -> MovementEntryDraft -> composer`

`OnDeviceInputInterpreter` remains the portable coordinator. `StructuredGenerationRuntime` remains the runtime port, so a future remote implementation can replace the local adapter without changing the request, result, domain mapping, or composer contracts.

## Runtime boundaries

- `schema-guided-interpretation` defines `InterpretationRequest`, `InterpretationOutcome`, and `StructuredGenerationRuntime`.
- `schema-guided-interpretation-json` provides the JSON prompt compiler and result decoder for strict structured output.
- Android assembles `LiteRtStructuredGenerationRuntime` and `AndroidInterpretationModelStore` around those portable contracts.

## Model provisioning

- The model is not versioned in Git.
- The current model is `litert-community/Gemma3-1B-IT` and Android expects `Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm`.
- Android expects a local file with a fixed file name, size, and SHA-256.
- The build stages the verified asset into generated Android assets and then copies it into private app storage on device.
- If the model file is missing or corrupt, the runtime fails with a typed, actionable interpretation failure.

## Smoke test

On a real device, verify these phrases:

- `Ayer pagué treinta euros en la peluquería`
- `Hoy me ingresaron la nómina de mil ochocientos euros`
- `Compré comida por 12,50`
- `Recibí 25 euros de devolución`
- `Pagué algo`

Check amount, type, relative date, category selection, note, missing fields, cold start time, warm inference time, cancellation, and composer wiring.
