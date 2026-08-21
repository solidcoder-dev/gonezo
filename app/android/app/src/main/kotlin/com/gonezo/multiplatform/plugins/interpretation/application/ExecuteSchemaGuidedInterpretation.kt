package com.gonezo.multiplatform.plugins.interpretation.application

import dev.solidcoder.interpretation.application.FieldInterpretationAttempt
import dev.solidcoder.interpretation.application.port.InputInterpreter
import dev.solidcoder.interpretation.application.InterpretationFailure
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.InterpretationOutcome
import dev.solidcoder.interpretation.json.InterpretationJsonCodec
import dev.solidcoder.interpretation.application.InterpretationCancellationException
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationFailurePhase

class ExecuteSchemaGuidedInterpretation(
  private val inputInterpreter: InputInterpreter,
  private val codec: InterpretationJsonCodec,
) {
  suspend fun execute(
    requestJson: String,
  ): ExecuteSchemaGuidedInterpretationResult {
    val request = codec.decodeRequest(requestJson)
    val outcome = inputInterpreter.interpret(request)
    return when (outcome) {
      is InterpretationOutcome.Success -> ExecuteSchemaGuidedInterpretationResult(
        resultJson = codec.encodeResult(outcome.result),
        attempts = outcome.attempts,
      )
      is InterpretationOutcome.Failure -> throw interpretationFailure(outcome.failure, outcome.attempts)
    }
  }

  private fun interpretationFailure(
    failure: InterpretationFailure,
    attempts: List<FieldInterpretationAttempt>,
  ): RuntimeException {
    if (failure.code == InterpretationFailureCode.CANCELLED) {
      return InterpretationCancellationException(
        attempts = attempts,
        message = failure.message,
        cause = failure.cause,
      )
    }

    val phase = failure.code.toFailurePhase()
    return InterpretationExecutionException(
      failureCode = failure.code,
      recoverable = failure.recoverable,
      phase = phase,
      safePublicMessage = failure.message,
      diagnostics = failure.diagnostics,
      attempts = attempts,
      cause = failure.cause,
    )
  }

  private fun InterpretationFailureCode.toFailurePhase(): StructuredGenerationFailurePhase = when (this) {
    InterpretationFailureCode.MODEL_UNAVAILABLE,
    InterpretationFailureCode.MODEL_CORRUPT -> StructuredGenerationFailurePhase.MODEL_RESOLUTION
    InterpretationFailureCode.UNSUPPORTED_DEVICE -> StructuredGenerationFailurePhase.ENGINE_INITIALIZATION
    InterpretationFailureCode.MALFORMED_OUTPUT -> StructuredGenerationFailurePhase.DECODING
    InterpretationFailureCode.INFERENCE_FAILED -> StructuredGenerationFailurePhase.GENERATION
    InterpretationFailureCode.INVALID_REQUEST -> StructuredGenerationFailurePhase.DECODING
    InterpretationFailureCode.CANCELLED -> StructuredGenerationFailurePhase.GENERATION
  }
}
