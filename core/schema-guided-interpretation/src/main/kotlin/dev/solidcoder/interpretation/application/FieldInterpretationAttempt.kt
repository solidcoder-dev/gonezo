package dev.solidcoder.interpretation.application

import dev.solidcoder.interpretation.domain.FieldKey

enum class FieldInterpretationAttemptStatus {
  DECODED,
  DECODING_FAILED,
  GENERATION_FAILED,
  CANCELLED,
}

data class FieldInterpretationAttempt(
  val fieldKey: FieldKey,
  val fieldIndex: Int,
  val attemptNumber: Int,
  val promptVariant: FieldPromptVariant,
  val status: FieldInterpretationAttemptStatus,
  val durationMs: Long,
  val outputLength: Int? = null,
  val raw: String? = null,
  val failureCode: InterpretationFailureCode? = null,
  val phase: StructuredGenerationFailurePhase? = null,
) {
  init {
    require(fieldIndex >= 0) { "field index must be non-negative" }
    require(attemptNumber >= 1) { "attempt number must be positive" }
    require(durationMs >= 0) { "attempt duration must be non-negative" }
    when (status) {
      FieldInterpretationAttemptStatus.DECODED,
      FieldInterpretationAttemptStatus.DECODING_FAILED -> require(raw != null) { "raw output is required for decoded attempts" }
      FieldInterpretationAttemptStatus.GENERATION_FAILED -> require(raw == null) { "generation failures must not carry raw output" }
      FieldInterpretationAttemptStatus.CANCELLED -> Unit
    }
  }
}
