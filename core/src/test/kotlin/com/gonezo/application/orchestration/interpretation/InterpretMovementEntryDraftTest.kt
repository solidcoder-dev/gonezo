package com.gonezo.application.orchestration.interpretation

import dev.solidcoder.interpretation.application.InputInterpreter
import dev.solidcoder.interpretation.application.InterpretationFailure
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.InterpretationOutcome
import dev.solidcoder.interpretation.application.InterpretationRequest
import dev.solidcoder.interpretation.domain.Confidence
import dev.solidcoder.interpretation.domain.FieldCandidate
import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldResult
import dev.solidcoder.interpretation.domain.InterpretationResult
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import dev.solidcoder.interpretation.domain.StructuredValue
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZoneId
import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class InterpretMovementEntryDraftTest {
  @Test
  fun `transcript valid produces a draft`() = runTest {
    val interpreter = RecordingInputInterpreter { request ->
      successResult(request)
    }
    val useCase = InterpretMovementEntryDraft(
      inputInterpreter = interpreter,
      specFactory = MovementEntryInterpretationSpecFactory(),
      resultMapper = InterpretationResultToMovementEntryDraftMapper(),
    )

    val outcome = useCase.execute(command())

    assertThat(outcome).isInstanceOf(InterpretMovementEntryDraftOutcome.Success::class.java)
    assertThat(interpreter.request).isNotNull
    assertThat((outcome as InterpretMovementEntryDraftOutcome.Success).draft.type).isEqualTo(MovementEntryDraftType.EXPENSE)
    assertThat(interpreter.request!!.context.valueOf(dev.solidcoder.interpretation.domain.ContextKey.of("currentDate")))
      .isEqualTo(dev.solidcoder.interpretation.domain.StructuredValue.Date(LocalDate.parse("2026-07-14")))
    assertThat(interpreter.request!!.context.valueOf(dev.solidcoder.interpretation.domain.ContextKey.of("timeZone")))
      .isEqualTo(dev.solidcoder.interpretation.domain.StructuredValue.Text("Europe/London"))
    assertThat(interpreter.request!!.context.valueOf(dev.solidcoder.interpretation.domain.ContextKey.of("inputLanguage")))
      .isEqualTo(dev.solidcoder.interpretation.domain.StructuredValue.Text("es"))
    assertThat(interpreter.request!!.context.valueOf(dev.solidcoder.interpretation.domain.ContextKey.of("locale")))
      .isEqualTo(dev.solidcoder.interpretation.domain.StructuredValue.Text("en-GB"))
    assertThat(interpreter.request!!.context.valueOf(dev.solidcoder.interpretation.domain.ContextKey.of("currency")))
      .isEqualTo(dev.solidcoder.interpretation.domain.StructuredValue.Text("EUR"))
  }

  @Test
  fun `empty transcript fails without invoking the interpreter`() = runTest {
    val interpreter = RecordingInputInterpreter { successResult(it) }
    val useCase = InterpretMovementEntryDraft(interpreter, MovementEntryInterpretationSpecFactory(), InterpretationResultToMovementEntryDraftMapper())

    val outcome = useCase.execute(command(transcript = "   "))

    assertThat(outcome).isEqualTo(
      InterpretMovementEntryDraftOutcome.Failure(
        InterpretMovementEntryDraftFailure(InterpretMovementEntryDraftFailureCode.EMPTY_TRANSCRIPT, true),
      ),
    )
    assertThat(interpreter.request).isNull()
  }

  @Test
  fun `failure generic failure translates to a gonezo failure`() = runTest {
    val interpreter = RecordingInputInterpreter {
      InterpretationOutcome.Failure(
        InterpretationFailure(
          code = InterpretationFailureCode.INFERENCE_FAILED,
          message = "failed",
          recoverable = true,
        ),
      )
    }
    val useCase = InterpretMovementEntryDraft(interpreter, MovementEntryInterpretationSpecFactory(), InterpretationResultToMovementEntryDraftMapper())

    val outcome = useCase.execute(command())

    assertThat(outcome).isEqualTo(
      InterpretMovementEntryDraftOutcome.Failure(
        InterpretMovementEntryDraftFailure(InterpretMovementEntryDraftFailureCode.INTERPRETATION_FAILED, true),
      ),
    )
  }

  @Test
  fun `schema id incorrect is rejected`() = runTest {
    val interpreter = RecordingInputInterpreter {
      InterpretationOutcome.Success(
        InterpretationResult.fromDecoded(
          specId = InterpretationSpecId.of("another"),
          specVersion = InterpretationSpecVersion.of("v1"),
          fields = validFields(),
        ),
      )
    }
    val useCase = InterpretMovementEntryDraft(interpreter, MovementEntryInterpretationSpecFactory(), InterpretationResultToMovementEntryDraftMapper())

    val outcome = useCase.execute(command())

    assertThat(outcome).isEqualTo(
      InterpretMovementEntryDraftOutcome.Failure(
        InterpretMovementEntryDraftFailure(InterpretMovementEntryDraftFailureCode.SCHEMA_INCOMPATIBLE, false),
      ),
    )
  }

  @Test
  fun `schema version incorrect is rejected`() = runTest {
    val interpreter = RecordingInputInterpreter {
      InterpretationOutcome.Success(
        InterpretationResult.fromDecoded(
          specId = InterpretationSpecId.of("movement-entry"),
          specVersion = InterpretationSpecVersion.of("2"),
          fields = validFields(),
        ),
      )
    }
    val useCase = InterpretMovementEntryDraft(interpreter, MovementEntryInterpretationSpecFactory(), InterpretationResultToMovementEntryDraftMapper())

    val outcome = useCase.execute(command())

    assertThat(outcome).isEqualTo(
      InterpretMovementEntryDraftOutcome.Failure(
        InterpretMovementEntryDraftFailure(InterpretMovementEntryDraftFailureCode.SCHEMA_INCOMPATIBLE, false),
      ),
    )
  }

  @Test
  fun `malformed result is rejected`() = runTest {
    val interpreter = RecordingInputInterpreter {
      InterpretationOutcome.Success(
        InterpretationResult.fromDecoded(
          specId = InterpretationSpecId.of("movement-entry"),
          specVersion = InterpretationSpecVersion.of("v1"),
          fields = listOf(
            FieldResult(FieldKey.of("type"), FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Enum("expense"), Confidence.of(0.9)))),
            FieldResult(FieldKey.of("amount"), FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Decimal(BigDecimal("-1")), Confidence.of(0.9)))),
            FieldResult(FieldKey.of("occurredOn"), FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Date(LocalDate.parse("2026-07-14")), Confidence.of(0.9)))),
            FieldResult(FieldKey.of("note"), FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Text("Food"), Confidence.of(0.9)))),
            FieldResult(FieldKey.of("categoryId"), FieldInterpretation.Missing),
          ),
        ),
      )
    }
    val useCase = InterpretMovementEntryDraft(interpreter, MovementEntryInterpretationSpecFactory(), InterpretationResultToMovementEntryDraftMapper())

    val outcome = useCase.execute(command())

    assertThat(outcome).isEqualTo(
      InterpretMovementEntryDraftOutcome.Failure(
        InterpretMovementEntryDraftFailure(InterpretMovementEntryDraftFailureCode.OUTPUT_INVALID, false),
      ),
    )
  }

  @Test
  fun `categories empty are valid`() = runTest {
    val interpreter = RecordingInputInterpreter { request ->
      assertThat(request.spec.fields.map { it.key.value }).containsExactly("type", "amount", "occurredOn", "note")
      successResult(request)
    }
    val useCase = InterpretMovementEntryDraft(interpreter, MovementEntryInterpretationSpecFactory(), InterpretationResultToMovementEntryDraftMapper())

    val outcome = useCase.execute(command(categories = emptyList()))

    assertThat(outcome).isInstanceOf(InterpretMovementEntryDraftOutcome.Success::class.java)
  }

  @Test
  fun `result does not invoke ledger`() = runTest {
    val interpreter = RecordingInputInterpreter { successResult(it) }
    val useCase = InterpretMovementEntryDraft(interpreter, MovementEntryInterpretationSpecFactory(), InterpretationResultToMovementEntryDraftMapper())

    val outcome = useCase.execute(command())

    assertThat(outcome).isInstanceOf(InterpretMovementEntryDraftOutcome.Success::class.java)
  }

  private fun command(
    transcript: String = "Lunch at the bakery",
    categories: List<MovementEntryCategoryOption> = listOf(
      MovementEntryCategoryOption("cat-food", "Food"),
      MovementEntryCategoryOption("cat-salary", "Salary"),
    ),
  ) = InterpretMovementEntryDraftCommand(
    transcript = transcript,
    inputLanguage = "es",
    currentDate = LocalDate.parse("2026-07-14"),
    zoneId = ZoneId.of("Europe/London"),
    locale = "en-GB",
    accountCurrency = "eur",
    categories = categories,
  )

  private fun successResult(request: InterpretationRequest): InterpretationOutcome.Success {
    val spec = request.spec
    val fields = spec.fields.map { field ->
      when (field.key.value) {
        "type" -> FieldResult(field.key, FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Enum("expense"), Confidence.of(0.9))))
        "amount" -> FieldResult(field.key, FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Decimal(BigDecimal("12.50")), Confidence.of(0.9))))
        "occurredOn" -> FieldResult(field.key, FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Date(LocalDate.parse("2026-07-13")), Confidence.of(0.9))))
        "note" -> FieldResult(field.key, FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Text("Lunch"), Confidence.of(0.9))))
        "categoryId" -> FieldResult(field.key, FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Enum("cat-food"), Confidence.of(0.9))))
        else -> error("unexpected field")
      }
    }
    return InterpretationOutcome.Success(
      InterpretationResult.fromDecoded(
        specId = spec.id,
        specVersion = spec.version,
        fields = fields,
      ),
    )
  }

  private fun validFields(): List<FieldResult> = listOf(
    FieldResult(FieldKey.of("type"), FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Enum("expense"), Confidence.of(0.9)))),
    FieldResult(FieldKey.of("amount"), FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Decimal(BigDecimal("12.50")), Confidence.of(0.9)))),
    FieldResult(FieldKey.of("occurredOn"), FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Date(LocalDate.parse("2026-07-13")), Confidence.of(0.9)))),
    FieldResult(FieldKey.of("note"), FieldInterpretation.Resolved(FieldCandidate(StructuredValue.Text("Lunch"), Confidence.of(0.9)))),
    FieldResult(FieldKey.of("categoryId"), FieldInterpretation.Missing),
  )

  private class RecordingInputInterpreter(
    private val responder: suspend (InterpretationRequest) -> InterpretationOutcome,
  ) : InputInterpreter {
    var request: InterpretationRequest? = null

    override suspend fun interpret(request: InterpretationRequest): InterpretationOutcome {
      this.request = request
      return responder(request)
    }
  }

  private fun <T> runTest(block: suspend () -> T): T {
    var completion: Result<T>? = null
    block.startCoroutine(object : Continuation<T> {
      override val context = EmptyCoroutineContext

      override fun resumeWith(result: Result<T>) {
        completion = result
      }
    })
    return checkNotNull(completion).getOrThrow()
  }
}
