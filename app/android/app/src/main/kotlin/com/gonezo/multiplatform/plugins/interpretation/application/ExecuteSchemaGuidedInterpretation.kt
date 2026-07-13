package com.gonezo.multiplatform.plugins.interpretation.application

import dev.solidcoder.interpretation.application.FieldInterpretationAttempt
import dev.solidcoder.interpretation.application.InputInterpreter
import dev.solidcoder.interpretation.application.InterpretationFailure
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.InterpretationOutcome
import dev.solidcoder.interpretation.json.InterpretationJsonCodec
import dev.solidcoder.interpretation.application.InterpretationCancellationException

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

  private fun InterpretationFailureCode.toFailurePhase(): dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase = when (this) {
    InterpretationFailureCode.MODEL_UNAVAILABLE,
    InterpretationFailureCode.MODEL_CORRUPT -> dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.MODEL_RESOLUTION
    InterpretationFailureCode.UNSUPPORTED_DEVICE -> dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.ENGINE_INITIALIZATION
    InterpretationFailureCode.MALFORMED_OUTPUT -> dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.DECODING
    InterpretationFailureCode.INFERENCE_FAILED -> dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.GENERATION
    InterpretationFailureCode.INVALID_REQUEST -> dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.DECODING
    InterpretationFailureCode.CANCELLED -> dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.GENERATION
  }
}
