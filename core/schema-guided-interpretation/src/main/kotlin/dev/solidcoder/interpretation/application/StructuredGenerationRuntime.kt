package dev.solidcoder.interpretation.application

import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.FieldSpec

data class StructuredGenerationRequest(
  val prompt: String,
  val spec: InterpretationSpec,
  val fieldKey: String? = null,
  val fieldIndex: Int? = null,
  val attemptNumber: Int? = null,
  val promptVariant: FieldPromptVariant = FieldPromptVariant.PRIMARY,
  val generationTimeoutMs: Long? = null,
) {
  init {
    require(prompt.isNotBlank()) { "structured generation prompt is required" }
    require(fieldIndex == null || fieldIndex >= 0) { "field index must be non-negative" }
    require(attemptNumber == null || attemptNumber >= 1) { "attempt number must be positive" }
    require(generationTimeoutMs == null || generationTimeoutMs > 0) { "generation timeout must be positive" }
  }
}

data class StructuredGenerationResult(
  val output: String,
)

enum class StructuredGenerationFailurePhase {
  MODEL_RESOLUTION,
  ENGINE_INITIALIZATION,
  CONVERSATION_CREATION,
  GENERATION,
  DECODING,
  ARTIFACT_STORAGE,
}

interface StructuredGenerationRuntime {
  suspend fun generate(request: StructuredGenerationRequest): StructuredGenerationResult
}

open class StructuredGenerationException(
  val failureCode: InterpretationFailureCode,
  val recoverable: Boolean,
  val phase: StructuredGenerationFailurePhase? = null,
  message: String,
  cause: Throwable? = null,
) : RuntimeException(message, cause)

enum class StructuredGenerationTimeoutKind {
  INDIVIDUAL,
  GLOBAL_BUDGET,
}

class StructuredGenerationTimeoutException(
  val timeoutKind: StructuredGenerationTimeoutKind,
  message: String,
  cause: Throwable? = null,
) : StructuredGenerationException(
  failureCode = InterpretationFailureCode.INFERENCE_FAILED,
  recoverable = true,
  phase = StructuredGenerationFailurePhase.GENERATION,
  message = message,
  cause = cause,
)

interface FieldInterpretationPromptCompiler {
  fun compile(
    request: InterpretationRequest,
    field: FieldSpec,
    variant: FieldPromptVariant = FieldPromptVariant.PRIMARY,
    previousViolation: FieldOutputViolation? = null,
  ): StructuredGenerationRequest
}

fun interface FieldInterpretationResultDecoder {
  fun decode(field: FieldSpec, generationResult: StructuredGenerationResult): FieldInterpretation
}
