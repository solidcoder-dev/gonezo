package dev.solidcoder.interpretation.application

import dev.solidcoder.interpretation.domain.InterpretationContext
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.InterpretationSpec

@JvmInline
value class InputSource private constructor(val value: String) {
  companion object {
    fun of(raw: String): InputSource {
      val normalized = raw.trim()
      require(normalized.isNotEmpty()) { "unstructured text is required" }
      return InputSource(normalized)
    }
  }

  override fun toString(): String = value
}

typealias UnstructuredText = InputSource

data class InterpretationRequest(
  val input: InputSource,
  val inputLanguage: String,
  val spec: InterpretationSpec,
  val context: InterpretationContext = InterpretationContext(),
) {
  init {
    require(inputLanguage.isNotBlank()) { "input language is required" }
  }
}

sealed interface InterpretationOutcome {
  data class Success(
    val result: dev.solidcoder.interpretation.domain.InterpretationResult,
    val attempts: List<FieldInterpretationAttempt> = emptyList(),
  ) : InterpretationOutcome

  data class Failure(
    val failure: InterpretationFailure,
    val attempts: List<FieldInterpretationAttempt> = emptyList(),
  ) : InterpretationOutcome
}

enum class InterpretationFailureCode {
  INVALID_REQUEST,
  MODEL_UNAVAILABLE,
  MODEL_CORRUPT,
  UNSUPPORTED_DEVICE,
  INFERENCE_FAILED,
  MALFORMED_OUTPUT,
  CANCELLED,
}

data class InterpretationFailure(
  val code: InterpretationFailureCode,
  val message: String,
  val recoverable: Boolean,
  val diagnostics: InterpretationFailureDiagnostics? = null,
  val cause: Throwable? = null,
)

data class InterpretationFailureDiagnostics(
  val fieldKey: FieldKey? = null,
  val fieldIndex: Int? = null,
  val fieldCount: Int? = null,
  val durationMs: Long? = null,
  val outputLength: Int? = null,
  val completedFieldKeys: List<FieldKey> = emptyList(),
  val failedFieldKey: FieldKey? = null,
  val failureCode: InterpretationFailureCode? = null,
  val phase: StructuredGenerationFailurePhase? = null,
)
