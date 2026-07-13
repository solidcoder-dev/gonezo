package com.gonezo.multiplatform.plugins.interpretation.application

import dev.solidcoder.interpretation.application.InputInterpreter
import dev.solidcoder.interpretation.application.InputSource
import dev.solidcoder.interpretation.application.FieldInterpretationAttempt
import dev.solidcoder.interpretation.application.FieldInterpretationAttemptStatus
import dev.solidcoder.interpretation.application.FieldPromptVariant
import dev.solidcoder.interpretation.application.InterpretationFailure
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.InterpretationOutcome
import dev.solidcoder.interpretation.application.InterpretationRequest
import dev.solidcoder.interpretation.domain.Confidence
import dev.solidcoder.interpretation.domain.FieldCandidate
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.FieldResult
import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.InterpretationContext
import dev.solidcoder.interpretation.domain.InterpretationResult
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import dev.solidcoder.interpretation.domain.StructuredValue
import dev.solidcoder.interpretation.json.InterpretationJsonCodec
import java.math.BigDecimal
import java.time.LocalDate
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Test

class ExecuteSchemaGuidedInterpretationTest {
  @Test
  fun decodesRequestInvokesInterpreterAndEncodesResult() = runBlocking {
    val codec = InterpretationJsonCodec()
    val spec = contactSpec()
    val request = InterpretationRequest(
      input = InputSource.of("Ada Lovelace 42"),
      inputLanguage = "en",
      spec = spec,
    )
    val requestJson = codec.encodeRequest(request)
    val interpreter = RecordingInterpreter { incoming ->
      assertEquals(request, incoming)
      InterpretationOutcome.Success(
        InterpretationResult.forSpec(
          spec = incoming.spec,
          candidates = mapOf(
            "personName" to FieldCandidate(StructuredValue.Text("Ada Lovelace"), Confidence.of(0.99)),
            "age" to FieldCandidate(StructuredValue.Integer(42), Confidence.of(0.99)),
          ),
        ),
        attempts = listOf(
          FieldInterpretationAttempt(
            fieldKey = FieldKey.of("personName"),
            fieldIndex = 0,
            attemptNumber = 1,
            promptVariant = FieldPromptVariant.PRIMARY,
            status = FieldInterpretationAttemptStatus.DECODED,
            durationMs = 5,
            outputLength = 96,
            raw = """{"kind":"resolved","candidate":{"value":{"type":"text","value":"Ada Lovelace"},"confidence":0.99}}""",
          ),
          FieldInterpretationAttempt(
            fieldKey = FieldKey.of("age"),
            fieldIndex = 1,
            attemptNumber = 1,
            promptVariant = FieldPromptVariant.PRIMARY,
            status = FieldInterpretationAttemptStatus.DECODED,
            durationMs = 6,
            outputLength = 78,
            raw = """{"kind":"resolved","candidate":{"value":{"type":"integer","value":42},"confidence":0.99}}""",
          ),
        ),
      )
    }
    val useCase = ExecuteSchemaGuidedInterpretation(interpreter, codec)

    val result = useCase.execute(requestJson)

    assertEquals(1, interpreter.invocations)
    assertEquals(request, interpreter.lastRequest)
    assertEquals(request.spec.id.value, codec.decodeResult(result.resultJson).specId.value)
    assertEquals(2, result.attempts.size)
    assertEquals(FieldInterpretationAttemptStatus.DECODED, result.attempts[0].status)
    assertFalse(requestJson.contains("gonezo-movement-entry"))
  }

  @Test
  fun preservesTypedFailureDetails() = runBlocking {
    val codec = InterpretationJsonCodec()
    listOf(
      InterpretationFailure(
        code = InterpretationFailureCode.MODEL_UNAVAILABLE,
        message = "model missing",
        recoverable = true,
      ) to dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.MODEL_RESOLUTION,
      InterpretationFailure(
        code = InterpretationFailureCode.MODEL_CORRUPT,
        message = "model corrupt",
        recoverable = false,
      ) to dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.MODEL_RESOLUTION,
      InterpretationFailure(
        code = InterpretationFailureCode.UNSUPPORTED_DEVICE,
        message = "gpu unavailable",
        recoverable = false,
      ) to dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
      InterpretationFailure(
        code = InterpretationFailureCode.INFERENCE_FAILED,
        message = "generation failed",
        recoverable = true,
      ) to dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.GENERATION,
      InterpretationFailure(
        code = InterpretationFailureCode.MALFORMED_OUTPUT,
        message = "invalid json",
        recoverable = true,
      ) to dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.DECODING,
    ).forEach { (failure, expectedPhase) ->
      val useCase = ExecuteSchemaGuidedInterpretation(
        inputInterpreter = object : InputInterpreter {
          override suspend fun interpret(request: InterpretationRequest): InterpretationOutcome =
            InterpretationOutcome.Failure(failure, attempts = emptyList())
        },
        codec = codec,
      )

      val exception = assertThrows(InterpretationExecutionException::class.java) {
        runBlocking {
          useCase.execute(codec.encodeRequest(request()))
        }
      }

      assertEquals(failure.code, exception.failureCode)
      assertEquals(failure.recoverable, exception.recoverable)
      assertEquals(expectedPhase, exception.phase)
      assertEquals(failure.message, exception.safePublicMessage)
      assertTrue(exception.attempts.isEmpty())
    }
  }

  @Test
  fun propagatesCancellationException() = runBlocking {
    val codec = InterpretationJsonCodec()
    val interpreter = object : InputInterpreter {
      override suspend fun interpret(request: InterpretationRequest): InterpretationOutcome {
        throw CancellationException("cancelled")
      }
    }
    val useCase = ExecuteSchemaGuidedInterpretation(
      inputInterpreter = interpreter,
      codec = codec,
    )

    try {
      useCase.execute(codec.encodeRequest(request()))
      error("expected cancellation")
    } catch (_: CancellationException) {
    }
  }

  @Test
  fun canBeCancelledByTheParentCoroutine() = runBlocking {
    val codec = InterpretationJsonCodec()
    val gate = CompletableDeferred<Unit>()
    val interpreter = object : InputInterpreter {
      override suspend fun interpret(request: InterpretationRequest): InterpretationOutcome {
        gate.complete(Unit)
        awaitCancellation()
      }
    }
    val useCase = ExecuteSchemaGuidedInterpretation(
      inputInterpreter = interpreter,
      codec = codec,
    )

    val job = launch {
      useCase.execute(codec.encodeRequest(request()))
    }
    gate.await()
    job.cancelAndJoin()
    assertTrue(job.isCancelled)
  }

  private fun request(): InterpretationRequest = InterpretationRequest(
    input = InputSource.of("Ada Lovelace 42"),
    inputLanguage = "en",
    spec = contactSpec(),
    context = InterpretationContext(emptyList()),
  )

  private fun contactSpec(): InterpretationSpec = InterpretationSpec(
    id = InterpretationSpecId.of("contact-extraction"),
    version = InterpretationSpecVersion.of("1"),
    fields = listOf(
      FieldSpec(FieldKey.of("personName"), FieldDescription.of("Person name"), FieldType.TEXT),
      FieldSpec(FieldKey.of("age"), FieldDescription.of("Age"), FieldType.INTEGER),
    ),
  )

  private class RecordingInterpreter(
    private val handler: suspend (InterpretationRequest) -> InterpretationOutcome,
  ) : InputInterpreter {
    var invocations = 0
    var lastRequest: InterpretationRequest? = null

    override suspend fun interpret(request: InterpretationRequest): InterpretationOutcome {
      invocations += 1
      lastRequest = request
      return handler(request)
    }
  }
}
