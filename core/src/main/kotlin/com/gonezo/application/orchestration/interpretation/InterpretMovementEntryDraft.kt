package com.gonezo.application.orchestration.interpretation

import dev.solidcoder.interpretation.application.InputInterpreter
import dev.solidcoder.interpretation.application.InterpretationOutcome
import dev.solidcoder.interpretation.application.InterpretationRequest
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.InputSource
import dev.solidcoder.interpretation.domain.ContextEntry
import dev.solidcoder.interpretation.domain.ContextKey
import dev.solidcoder.interpretation.domain.InterpretationContext
import dev.solidcoder.interpretation.domain.InterpretationResult
import dev.solidcoder.interpretation.domain.StructuredValue
import java.time.LocalDate
import java.time.ZoneId
import kotlin.coroutines.cancellation.CancellationException

data class InterpretMovementEntryDraftCommand(
  val transcript: String,
  val inputLanguage: String,
  val currentDate: LocalDate,
  val zoneId: ZoneId,
  val locale: String,
  val accountCurrency: String,
  val categories: List<MovementEntryCategoryOption>,
)

enum class InterpretMovementEntryDraftFailureCode {
  INVALID_INPUT,
  EMPTY_TRANSCRIPT,
  INTERPRETATION_CANCELLED,
  MODEL_UNAVAILABLE,
  OUTPUT_INVALID,
  INTERPRETATION_FAILED,
  SCHEMA_INCOMPATIBLE,
}

data class InterpretMovementEntryDraftFailure(
  val code: InterpretMovementEntryDraftFailureCode,
  val recoverable: Boolean,
)

sealed interface InterpretMovementEntryDraftOutcome {
  data class Success(val draft: MovementEntryDraft) : InterpretMovementEntryDraftOutcome

  data class Failure(val failure: InterpretMovementEntryDraftFailure) : InterpretMovementEntryDraftOutcome
}

class InterpretMovementEntryDraft(
  private val inputInterpreter: InputInterpreter,
  private val specFactory: MovementEntryInterpretationSpecFactory,
  private val resultMapper: InterpretationResultToMovementEntryDraftMapper,
) {
  suspend fun execute(command: InterpretMovementEntryDraftCommand): InterpretMovementEntryDraftOutcome {
    try {
      val transcript = command.transcript.trim()
      if (transcript.isEmpty()) {
        return failure(InterpretMovementEntryDraftFailureCode.EMPTY_TRANSCRIPT, recoverable = true)
      }

      if (command.locale.trim().isEmpty() || command.accountCurrency.trim().isEmpty()) {
        return failure(InterpretMovementEntryDraftFailureCode.INVALID_INPUT, recoverable = false)
      }
      if (command.inputLanguage.trim().isEmpty()) {
        return failure(InterpretMovementEntryDraftFailureCode.INVALID_INPUT, recoverable = false)
      }

      val spec = specFactory.create(command.categories)
      val request = InterpretationRequest(
        input = InputSource.of(transcript),
        inputLanguage = command.inputLanguage.trim(),
        spec = spec,
        context = interpretationContext(command),
      )

      return when (val outcome = inputInterpreter.interpret(request)) {
        is InterpretationOutcome.Failure -> mapFailure(outcome.failure.code, outcome.failure.recoverable)
        is InterpretationOutcome.Success -> mapSuccess(outcome.result, spec)
      }
    } catch (exception: CancellationException) {
      throw exception
    }
  }

  private fun mapSuccess(
    result: InterpretationResult,
    expectedSpec: dev.solidcoder.interpretation.domain.InterpretationSpec,
  ): InterpretMovementEntryDraftOutcome {
    if (result.specId != expectedSpec.id || result.specVersion != expectedSpec.version) {
      return failure(InterpretMovementEntryDraftFailureCode.SCHEMA_INCOMPATIBLE, recoverable = false)
    }

    return try {
      InterpretMovementEntryDraftOutcome.Success(resultMapper.map(result))
    } catch (_: IllegalArgumentException) {
      failure(InterpretMovementEntryDraftFailureCode.OUTPUT_INVALID, recoverable = false)
    }
  }

  private fun mapFailure(code: InterpretationFailureCode, recoverable: Boolean): InterpretMovementEntryDraftOutcome = when (code) {
    InterpretationFailureCode.CANCELLED -> failure(InterpretMovementEntryDraftFailureCode.INTERPRETATION_CANCELLED, recoverable)
    InterpretationFailureCode.MODEL_UNAVAILABLE,
    InterpretationFailureCode.MODEL_CORRUPT,
    InterpretationFailureCode.UNSUPPORTED_DEVICE,
      -> failure(InterpretMovementEntryDraftFailureCode.MODEL_UNAVAILABLE, recoverable)

    InterpretationFailureCode.MALFORMED_OUTPUT -> failure(InterpretMovementEntryDraftFailureCode.OUTPUT_INVALID, recoverable)
    InterpretationFailureCode.INFERENCE_FAILED -> failure(InterpretMovementEntryDraftFailureCode.INTERPRETATION_FAILED, recoverable)
    InterpretationFailureCode.INVALID_REQUEST -> failure(InterpretMovementEntryDraftFailureCode.INVALID_INPUT, recoverable)
  }

  private fun failure(code: InterpretMovementEntryDraftFailureCode, recoverable: Boolean): InterpretMovementEntryDraftOutcome =
    InterpretMovementEntryDraftOutcome.Failure(InterpretMovementEntryDraftFailure(code, recoverable))

  private fun interpretationContext(command: InterpretMovementEntryDraftCommand): InterpretationContext = InterpretationContext(
    entries = listOf(
      ContextEntry(ContextKey.of("currentDate"), StructuredValue.Date(command.currentDate)),
      ContextEntry(ContextKey.of("timeZone"), StructuredValue.Text(command.zoneId.id)),
      ContextEntry(ContextKey.of("inputLanguage"), StructuredValue.Text(command.inputLanguage.trim())),
      ContextEntry(ContextKey.of("locale"), StructuredValue.Text(command.locale.trim())),
      ContextEntry(ContextKey.of("currency"), StructuredValue.Text(command.accountCurrency.trim().uppercase())),
    ),
  )
}
