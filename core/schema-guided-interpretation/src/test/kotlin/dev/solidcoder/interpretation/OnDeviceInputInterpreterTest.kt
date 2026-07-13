package dev.solidcoder.interpretation

import dev.solidcoder.interpretation.application.FieldInterpretationPromptCompiler
import dev.solidcoder.interpretation.application.FieldInterpretationResultDecoder
import dev.solidcoder.interpretation.application.FieldInterpretationAttemptStatus
import dev.solidcoder.interpretation.application.FieldOutputDecodingException
import dev.solidcoder.interpretation.application.FieldOutputViolation
import dev.solidcoder.interpretation.application.InterpretationCancellationException
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.InterpretationClock
import dev.solidcoder.interpretation.application.InterpretationOutcome
import dev.solidcoder.interpretation.application.InterpretationRequest
import dev.solidcoder.interpretation.application.OnDeviceInputInterpreter
import dev.solidcoder.interpretation.application.FieldPromptVariant
import dev.solidcoder.interpretation.application.FieldProcessingOrder
import dev.solidcoder.interpretation.application.StructuredGenerationException
import dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase
import dev.solidcoder.interpretation.application.StructuredGenerationRequest
import dev.solidcoder.interpretation.application.StructuredGenerationResult
import dev.solidcoder.interpretation.application.StructuredGenerationRuntime
import dev.solidcoder.interpretation.application.StructuredGenerationTimeoutException
import dev.solidcoder.interpretation.application.StructuredGenerationTimeoutKind
import dev.solidcoder.interpretation.application.UnstructuredText
import dev.solidcoder.interpretation.domain.AllowedValue
import dev.solidcoder.interpretation.domain.Confidence
import dev.solidcoder.interpretation.domain.FieldCandidate
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldResult
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationResult
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import dev.solidcoder.interpretation.domain.StructuredValue
import java.math.BigDecimal
import java.time.LocalDate
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlin.coroutines.cancellation.CancellationException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.catchThrowable
import org.junit.jupiter.api.Test

class OnDeviceInputInterpreterTest {
  @Test
  fun `processes five fields sequentially in spec order and accumulates results`() = runBlocking {
    val spec = movementSpec()
    val promptCompiler = RecordingPromptCompiler()
    val runtime = ScriptedRuntime(
      outputsByFieldKey = spec.fields.associate { field -> field.key.value to field.key.value },
    )
    val decoder = ScriptedDecoder(
      interpretationsByFieldKey = mapOf(
        "type" to resolvedEnum("expense"),
        "amount" to resolvedDecimal("20"),
        "occurredOn" to FieldInterpretation.Missing,
        "categoryId" to resolvedEnum("transport"),
        "note" to resolvedText("Gasolina 95"),
      ),
    )
    val interpreter = OnDeviceInputInterpreter(promptCompiler, runtime, decoder)
    val request = request(spec)

    val outcome = interpreter.interpret(request)

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Success::class.java)
    val result = (outcome as InterpretationOutcome.Success).result
    assertThat(outcome.attempts).hasSize(5)
    assertThat(outcome.attempts).extracting<String> { it.fieldKey.value }.containsExactly("type", "amount", "occurredOn", "categoryId", "note")
    assertThat(outcome.attempts).extracting<FieldInterpretationAttemptStatus> { it.status }.containsExactly(
      FieldInterpretationAttemptStatus.DECODED,
      FieldInterpretationAttemptStatus.DECODED,
      FieldInterpretationAttemptStatus.DECODED,
      FieldInterpretationAttemptStatus.DECODED,
      FieldInterpretationAttemptStatus.DECODED,
    )
    assertThat(outcome.attempts).extracting<String?> { it.raw }.containsExactly(
      "type",
      "amount",
      "occurredOn",
      "categoryId",
      "note",
    )
    assertThat(result.fields).extracting<String> { it.key.value }.containsExactly("type", "amount", "occurredOn", "categoryId", "note")
    assertThat(result.fields[0].interpretation).isEqualTo(resolvedEnum("expense"))
    assertThat(result.fields[1].interpretation).isEqualTo(resolvedDecimal("20"))
    assertThat(result.fields[2].interpretation).isEqualTo(FieldInterpretation.Missing)
    assertThat(result.fields[3].interpretation).isEqualTo(resolvedEnum("transport"))
    assertThat(result.fields[4].interpretation).isEqualTo(resolvedText("Gasolina 95"))
    assertThat(promptCompiler.fields).extracting<String> { it.key.value }.containsExactly("type", "amount", "occurredOn", "categoryId", "note")
    assertThat(runtime.requests).hasSize(5)
    assertThat(runtime.maxActive).isEqualTo(1)
  }

  @Test
  fun `preserves missing and ambiguous interpretations`() = runBlocking {
    val spec = movementSpec()
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = RecordingPromptCompiler(),
      runtime = ScriptedRuntime(spec.fields.associate { field -> field.key.value to field.key.value }),
      resultDecoder = ScriptedDecoder(
        interpretationsByFieldKey = mapOf(
          "type" to resolvedEnum("expense"),
          "amount" to resolvedDecimal("20"),
          "occurredOn" to FieldInterpretation.Missing,
          "categoryId" to FieldInterpretation.Ambiguous(
            listOf(
              candidate(StructuredValue.Enum("transport"), 0.60),
              candidate(StructuredValue.Enum("food"), 0.40),
            ),
          ),
          "note" to resolvedText("Gasolina 95"),
        ),
      ),
    )

    val outcome = interpreter.interpret(request(spec))

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Success::class.java)
    val result = (outcome as InterpretationOutcome.Success).result
    assertThat(result.fields[2].interpretation).isEqualTo(FieldInterpretation.Missing)
    assertThat(result.fields[3].interpretation).isEqualTo(
      FieldInterpretation.Ambiguous(
        listOf(
          candidate(StructuredValue.Enum("transport"), 0.60),
          candidate(StructuredValue.Enum("food"), 0.40),
        ),
      ),
    )
  }

  @Test
  fun `retries once after a decoding failure and continues with later fields`() = runBlocking {
    val spec = movementSpec()
    val promptCompiler = RecordingPromptCompiler()
    val runtime = ScriptedRuntime(
      outputsByFieldKey = spec.fields.associate { field -> field.key.value to field.key.value },
      outputsByFieldKeySequence = mapOf(
        "occurredOn" to listOf(
          """```json
{"kind":"resolved","value":"2026-07-14","confidence":0.91}
```""",
          """{"kind":"resolved","value":"2026-07-14","confidence":0.91}""",
        ),
      ),
    )
    val decoder = object : FieldInterpretationResultDecoder {
      private val attempts = mutableMapOf<String, Int>()

      override fun decode(field: FieldSpec, generationResult: StructuredGenerationResult): FieldInterpretation {
        val attempt = attempts.merge(field.key.value, 1, Int::plus) ?: 1
        return when (field.key.value) {
          "type" -> resolvedEnum("expense")
          "amount" -> resolvedDecimal("20")
          "occurredOn" -> {
            if (attempt == 1) {
              throw FieldOutputDecodingException(FieldOutputViolation.WRONG_PROPERTIES, "invalid field output")
            }
            FieldInterpretation.Resolved(candidate(StructuredValue.Date(LocalDate.parse("2026-07-14")), 0.91))
          }
          "categoryId" -> resolvedEnum("transport")
          "note" -> resolvedText("Gasolina 95")
          else -> error("unexpected field ${field.key.value}")
        }
      }
    }
    val interpreter = OnDeviceInputInterpreter(promptCompiler, runtime, decoder)

    val outcome = interpreter.interpret(request(spec))

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Success::class.java)
    val result = (outcome as InterpretationOutcome.Success).result
    assertThat(outcome.attempts).hasSize(6)
    assertThat(outcome.attempts).extracting<String> { it.fieldKey.value }.containsExactly(
      "type",
      "amount",
      "occurredOn",
      "occurredOn",
      "categoryId",
      "note",
    )
    assertThat(outcome.attempts).extracting<Int> { it.attemptNumber }.containsExactly(1, 1, 1, 2, 1, 1)
    assertThat(outcome.attempts).extracting<String> { it.promptVariant.name.lowercase() }.containsExactly(
      "primary",
      "primary",
      "primary",
      "format_retry",
      "primary",
      "primary",
    )
    assertThat(outcome.attempts[2].status).isEqualTo(FieldInterpretationAttemptStatus.DECODING_FAILED)
    assertThat(outcome.attempts[3].status).isEqualTo(FieldInterpretationAttemptStatus.DECODED)
    assertThat(outcome.attempts).extracting<Int> { it.fieldIndex }.containsExactly(0, 1, 2, 2, 3, 4)
    assertThat(outcome.attempts[2].raw).isEqualTo("""```json
{"kind":"resolved","value":"2026-07-14","confidence":0.91}
```""")
    assertThat(outcome.attempts[3].raw).isEqualTo("""{"kind":"resolved","value":"2026-07-14","confidence":0.91}""")
    assertThat(result.fields).extracting<String> { it.key.value }.containsExactly("type", "amount", "occurredOn", "categoryId", "note")
    assertThat(result.fields[2].interpretation).isEqualTo(
      FieldInterpretation.Resolved(candidate(StructuredValue.Date(LocalDate.parse("2026-07-14")), 0.91)),
    )
    assertThat(result.issues).isEmpty()
    assertThat(promptCompiler.fields).extracting<String> { it.key.value }.containsExactly(
      "type",
      "amount",
      "occurredOn",
      "occurredOn",
      "categoryId",
      "note",
    )
    assertThat(promptCompiler.previousViolations).containsExactly(
      null,
      null,
      null,
      FieldOutputViolation.WRONG_PROPERTIES,
      null,
      null,
    )
    assertThat(runtime.requests).hasSize(6)
  }

  @Test
  fun `degrades a field to missing after two decoding failures and keeps later fields`() = runBlocking {
    val spec = movementSpec()
    val promptCompiler = RecordingPromptCompiler()
    val runtime = ScriptedRuntime(spec.fields.associate { field -> field.key.value to field.key.value })
    val decoder = ScriptedDecoder(
      interpretationsByFieldKey = mapOf(
        "type" to resolvedEnum("expense"),
        "amount" to resolvedDecimal("20"),
        "occurredOn" to resolvedEnum("forbidden"),
        "categoryId" to resolvedEnum("transport"),
        "note" to resolvedText("Gasolina 95"),
      ),
    )
    val interpreter = OnDeviceInputInterpreter(promptCompiler, runtime, decoder)

    val outcome = interpreter.interpret(request(spec))

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Success::class.java)
    val result = (outcome as InterpretationOutcome.Success).result
    assertThat(outcome.attempts).hasSize(6)
    assertThat(outcome.attempts).extracting<FieldInterpretationAttemptStatus> { it.status }.containsExactly(
      FieldInterpretationAttemptStatus.DECODED,
      FieldInterpretationAttemptStatus.DECODED,
      FieldInterpretationAttemptStatus.DECODING_FAILED,
      FieldInterpretationAttemptStatus.DECODING_FAILED,
      FieldInterpretationAttemptStatus.DECODED,
      FieldInterpretationAttemptStatus.DECODED,
    )
    assertThat(result.fields[2].interpretation).isEqualTo(FieldInterpretation.Missing)
    assertThat(result.issues).containsExactly(
      dev.solidcoder.interpretation.domain.InterpretationIssue(
        code = "field_output_invalid",
        message = "The local interpreter returned an invalid structured result for this field.",
        level = dev.solidcoder.interpretation.domain.InterpretationIssueLevel.WARNING,
        fieldKey = FieldKey.of("occurredOn"),
      ),
    )
    assertThat(result.fields).extracting<String> { it.key.value }.containsExactly("type", "amount", "occurredOn", "categoryId", "note")
    assertThat(runtime.requests).hasSize(6)
    assertThat(promptCompiler.fields).extracting<String> { it.key.value }.containsExactly(
      "type",
      "amount",
      "occurredOn",
      "occurredOn",
      "categoryId",
      "note",
    )
  }

  @Test
  fun `rejects incompatible type output on the third field and stops the remaining fields`() = runBlocking {
    val spec = movementSpec()
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = RecordingPromptCompiler(),
      runtime = ScriptedRuntime(spec.fields.associate { field -> field.key.value to field.key.value }),
      resultDecoder = ScriptedDecoder(
        interpretationsByFieldKey = mapOf(
          "type" to resolvedEnum("expense"),
          "amount" to resolvedEnum("not-a-decimal"),
          "occurredOn" to FieldInterpretation.Missing,
          "categoryId" to resolvedEnum("transport"),
          "note" to resolvedText("Gasolina 95"),
        ),
      ),
    )

    val outcome = interpreter.interpret(request(spec))

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Failure::class.java)
    assertThat((outcome as InterpretationOutcome.Failure).failure.code).isEqualTo(InterpretationFailureCode.MALFORMED_OUTPUT)
  }

  @Test
  fun `propagates runtime failures and stops later fields`() = runBlocking {
    val spec = movementSpec()
    val runtime = ScriptedRuntime(
      outputsByFieldKey = spec.fields.associate { field -> field.key.value to field.key.value },
      failureByFieldKey = mapOf(
        "occurredOn" to StructuredGenerationException(
          failureCode = InterpretationFailureCode.MODEL_UNAVAILABLE,
          recoverable = false,
          phase = StructuredGenerationFailurePhase.MODEL_RESOLUTION,
          message = "model missing",
        ),
      ),
    )
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = RecordingPromptCompiler(),
      runtime = runtime,
      resultDecoder = ScriptedDecoder(
        interpretationsByFieldKey = mapOf(
          "type" to resolvedEnum("expense"),
          "amount" to resolvedDecimal("20"),
          "occurredOn" to FieldInterpretation.Missing,
          "categoryId" to resolvedEnum("transport"),
          "note" to resolvedText("Gasolina 95"),
        ),
      ),
    )

    val outcome = interpreter.interpret(request(spec))

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Failure::class.java)
    val failure = (outcome as InterpretationOutcome.Failure).failure
    assertThat(outcome.attempts).hasSize(3)
    assertThat(outcome.attempts).extracting<FieldInterpretationAttemptStatus> { it.status }.containsExactly(
      FieldInterpretationAttemptStatus.DECODED,
      FieldInterpretationAttemptStatus.DECODED,
      FieldInterpretationAttemptStatus.GENERATION_FAILED,
    )
    val failedAttempt = outcome.attempts.last()
    assertThat(failedAttempt.raw).isNull()
    assertThat(failedAttempt.outputLength).isNull()
    assertThat(failedAttempt.fieldKey.value).isEqualTo("occurredOn")
    assertThat(failure.code).isEqualTo(InterpretationFailureCode.MODEL_UNAVAILABLE)
    assertThat(failure.diagnostics?.fieldKey?.value).isEqualTo("occurredOn")
    assertThat(requireNotNull(failure.diagnostics).completedFieldKeys).extracting<String> { it.value }.containsExactly("type", "amount")
    assertThat(runtime.requests).hasSize(3)
  }

  @Test
  fun `propagates cancellation and does not request later fields`() = runBlocking {
    val spec = movementSpec()
    val started = CompletableDeferred<Unit>()
    val release = CompletableDeferred<Unit>()
    val runtime = ScriptedRuntime(
      outputsByFieldKey = spec.fields.associate { field -> field.key.value to field.key.value },
      onGenerate = { fieldKey ->
        if (fieldKey == "type") {
          started.complete(Unit)
          release.await()
        }
      },
    )
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = RecordingPromptCompiler(),
      runtime = runtime,
      resultDecoder = ScriptedDecoder(
        interpretationsByFieldKey = mapOf(
          "type" to resolvedEnum("expense"),
          "amount" to resolvedDecimal("20"),
          "occurredOn" to FieldInterpretation.Missing,
          "categoryId" to resolvedEnum("transport"),
          "note" to resolvedText("Gasolina 95"),
        ),
      ),
    )
    val job = launch {
      interpreter.interpret(request(spec))
    }

    started.await()
    job.cancel()
    release.complete(Unit)
    job.cancelAndJoin()

    assertThat(job.isCancelled).isTrue()
    assertThat(runtime.requests).hasSize(1)
  }

  @Test
  fun `records cancelled output when decoding is interrupted after generation`() = runBlocking {
    val spec = movementSpec()
    val runtime = ScriptedRuntime(
      outputsByFieldKey = mapOf("type" to "```json\n{\"kind\":\"resolved\"}\n```"),
    )
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = RecordingPromptCompiler(),
      runtime = runtime,
      resultDecoder = object : FieldInterpretationResultDecoder {
        override fun decode(field: FieldSpec, generationResult: StructuredGenerationResult): FieldInterpretation {
          throw CancellationException("cancelled while decoding")
        }
      },
    )

    val thrown = catchThrowable {
      runBlocking {
        interpreter.interpret(request(spec))
      }
    }

    assertThat(thrown).isInstanceOf(InterpretationCancellationException::class.java)
    val exception = thrown as InterpretationCancellationException
    assertThat(exception.attempts).hasSize(1)
    assertThat(exception.attempts.single().status).isEqualTo(FieldInterpretationAttemptStatus.CANCELLED)
    assertThat(exception.attempts.single().raw).isEqualTo("```json\n{\"kind\":\"resolved\"}\n```")
  }

  @Test
  fun `keeps the exact raw output including markdown and whitespace`() = runBlocking {
    val spec = movementSpec()
    val rawOutput = """
      
      ```json
      {"kind":"resolved","candidate":{"value":{"type":"text","value":"  padded  "},"confidence":0.99}}
      ```
      
    """.trimIndent()
    val runtime = ScriptedRuntime(outputsByFieldKey = mapOf("type" to rawOutput))
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = RecordingPromptCompiler(),
      runtime = runtime,
      resultDecoder = ScriptedDecoder(
        interpretationsByFieldKey = mapOf("type" to resolvedEnum("expense")),
      ),
    )

    val outcome = interpreter.interpret(request(spec))

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Success::class.java)
    assertThat((outcome as InterpretationOutcome.Success).attempts.single().raw).isEqualTo(rawOutput)
    assertThat(outcome.attempts.single().outputLength).isEqualTo(rawOutput.length)
  }

  @Test
  fun `does not leak state across separate interpretations`() = runBlocking {
    val spec = movementSpec()
    val runtime = ScriptedRuntime(
      outputsByFieldKey = mapOf(
        "type" to "type",
        "amount" to "amount",
        "occurredOn" to "occurredOn",
        "categoryId" to "categoryId",
        "note" to "note",
      ),
    )
    val decoder = ScriptedDecoder(
      interpretationsByFieldKey = mapOf(
        "type" to resolvedEnum("expense"),
        "amount" to resolvedDecimal("20"),
        "occurredOn" to FieldInterpretation.Missing,
        "categoryId" to resolvedEnum("transport"),
        "note" to resolvedText("Gasolina 95"),
      ),
    )
    val interpreter = OnDeviceInputInterpreter(RecordingPromptCompiler(), runtime, decoder)

    val first = interpreter.interpret(request(spec, "20 euros de gasolina 95"))
    val second = interpreter.interpret(request(spec, "12 euros de comida"))

    assertThat(first).isInstanceOf(InterpretationOutcome.Success::class.java)
    assertThat(second).isInstanceOf(InterpretationOutcome.Success::class.java)
    assertThat((first as InterpretationOutcome.Success).result.fields).hasSize(5)
    assertThat((second as InterpretationOutcome.Success).result.fields).hasSize(5)
    assertThat(runtime.requests).hasSize(10)
  }

  @Test
  fun `does not run generations concurrently`() = runBlocking {
    val spec = movementSpec()
    val started = CompletableDeferred<Unit>()
    val release = CompletableDeferred<Unit>()
    val runtime = ScriptedRuntime(
      outputsByFieldKey = spec.fields.associate { field -> field.key.value to field.key.value },
      onGenerate = { fieldKey ->
        if (fieldKey == "type") {
          started.complete(Unit)
          release.await()
        }
      },
    )
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = RecordingPromptCompiler(),
      runtime = runtime,
      resultDecoder = ScriptedDecoder(
        interpretationsByFieldKey = mapOf(
          "type" to resolvedEnum("expense"),
          "amount" to resolvedDecimal("20"),
          "occurredOn" to FieldInterpretation.Missing,
          "categoryId" to resolvedEnum("transport"),
          "note" to resolvedText("Gasolina 95"),
        ),
      ),
    )
    val job = launch {
      interpreter.interpret(request(spec))
    }

    started.await()
    delay(50)
    assertThat(runtime.maxActive).isEqualTo(1)
    assertThat(runtime.invocations).isEqualTo(1)
    release.complete(Unit)
    job.cancelAndJoin()
  }

  @Test
  fun `stops before starting the next field when the global interpretation budget is exhausted`() = runBlocking {
    val clock = MutableClock()
    val spec = movementSpec()
    val promptCompiler = RecordingPromptCompiler()
    val runtime = ScriptedRuntime(
      outputsByFieldKey = spec.fields.associate { field -> field.key.value to field.key.value },
      onGenerate = { fieldKey ->
        if (fieldKey == "type") {
          clock.advanceBy(90_001)
        }
      },
    )
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = promptCompiler,
      runtime = runtime,
      resultDecoder = ScriptedDecoder(
        interpretationsByFieldKey = mapOf(
          "type" to resolvedEnum("expense"),
          "amount" to resolvedDecimal("20"),
          "occurredOn" to FieldInterpretation.Missing,
          "categoryId" to resolvedEnum("transport"),
          "note" to resolvedText("Gasolina 95"),
        ),
      ),
      interpretationClock = clock,
      interpretationTimeoutMs = 90_000,
    )

    val outcome = interpreter.interpret(request(spec))

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Failure::class.java)
    val failure = (outcome as InterpretationOutcome.Failure).failure
    assertThat(failure.code).isEqualTo(InterpretationFailureCode.INFERENCE_FAILED)
    assertThat(requireNotNull(failure.diagnostics).phase).isEqualTo(dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase.GENERATION)
    assertThat(outcome.attempts).hasSize(1)
    assertThat(outcome.attempts.single().fieldKey.value).isEqualTo("type")
    assertThat(outcome.attempts.single().promptVariant).isEqualTo(FieldPromptVariant.PRIMARY)
    assertThat(runtime.requests).hasSize(1)
    assertThat(promptCompiler.fields).extracting<String> { it.key.value }.containsExactly("type")
    assertThat(runtime.requests.single().prompt).contains("field=type")
  }

  @Test
  fun `does not retry a valid primary interpretation`() = runBlocking {
    val spec = InterpretationSpec(
      id = InterpretationSpecId.of("single-field"),
      version = InterpretationSpecVersion.of("1"),
      fields = listOf(
        FieldSpec(
          key = FieldKey.of("note"),
          description = FieldDescription.of("A short note"),
          type = FieldType.TEXT,
        ),
      ),
    )
    val runtime = ScriptedRuntime(outputsByFieldKey = mapOf("note" to "note"))
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = RecordingPromptCompiler(),
      runtime = runtime,
      resultDecoder = ScriptedDecoder(
        interpretationsByFieldKey = mapOf("note" to resolvedText("note")),
      ),
      interpretationClock = MutableClock(),
      interpretationTimeoutMs = 90_000,
    )

    val outcome = interpreter.interpret(request(spec, "single note"))

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Success::class.java)
    assertThat((outcome as InterpretationOutcome.Success).attempts).hasSize(1)
    assertThat(runtime.requests).hasSize(1)
    assertThat(runtime.requests.single().prompt).contains("field=note")
  }

  @Test
  fun `measures each attempt independently when a field retries`() = runBlocking {
    val clock = MutableClock()
    val generationCounts = mutableMapOf<String, Int>()
    val spec = InterpretationSpec(
      id = InterpretationSpecId.of("retry-spec"),
      version = InterpretationSpecVersion.of("1"),
      fields = listOf(
        FieldSpec(
          key = FieldKey.of("occurredOn"),
          description = FieldDescription.of("Date when the event happened"),
          type = FieldType.DATE,
          required = true,
          format = "local-date",
        ),
      ),
    )
    val runtime = ScriptedRuntime(
      outputsByFieldKeySequence = mapOf(
        "occurredOn" to listOf(
          "invalid-json",
          """{"kind":"resolved","value":"2026-07-14","confidence":0.91}""",
        ),
      ),
      outputsByFieldKey = mapOf("occurredOn" to "invalid-json"),
      onGenerate = { fieldKey ->
        val invocation = generationCounts.getOrDefault(fieldKey, 0) + 1
        generationCounts[fieldKey] = invocation
        if (fieldKey == "occurredOn" && invocation == 1) {
          clock.advanceBy(12)
        } else if (fieldKey == "occurredOn") {
          clock.advanceBy(7)
        }
      },
    )
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = RecordingPromptCompiler(),
      runtime = runtime,
      resultDecoder = object : FieldInterpretationResultDecoder {
        private var attempts = 0

        override fun decode(field: FieldSpec, generationResult: StructuredGenerationResult): FieldInterpretation {
          attempts += 1
          if (attempts == 1) {
            throw FieldOutputDecodingException(FieldOutputViolation.INVALID_JSON, "invalid field output")
          }
          return FieldInterpretation.Resolved(candidate(StructuredValue.Date(LocalDate.parse("2026-07-14")), 0.91))
        }
      },
      interpretationClock = clock,
      interpretationTimeoutMs = 90_000,
    )

    val outcome = interpreter.interpret(request(spec))

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Success::class.java)
    val success = outcome as InterpretationOutcome.Success
    assertThat(success.attempts.map { it.durationMs }).containsExactly(12L, 7L)
  }

  @Test
  fun `treats an individual timeout as a missing field without retrying and keeps later fields`() = runBlocking {
    val spec = movementSpec()
    val promptCompiler = RecordingPromptCompiler()
    val runtime = ScriptedRuntime(
      outputsByFieldKey = spec.fields.associate { field -> field.key.value to field.key.value },
      failureByFieldKey = mapOf(
        "occurredOn" to StructuredGenerationTimeoutException(
          timeoutKind = StructuredGenerationTimeoutKind.INDIVIDUAL,
          message = "timed out while generating occurredOn",
        ),
      ),
    )
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = promptCompiler,
      runtime = runtime,
      resultDecoder = ScriptedDecoder(
        interpretationsByFieldKey = mapOf(
          "type" to resolvedEnum("expense"),
          "amount" to resolvedDecimal("20"),
          "categoryId" to resolvedEnum("transport"),
          "note" to resolvedText("Gasolina 95"),
        ),
      ),
    )

    val outcome = interpreter.interpret(request(spec))

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Success::class.java)
    val success = outcome as InterpretationOutcome.Success
    assertThat(success.attempts).extracting<String> { it.fieldKey.value }.containsExactly(
      "type",
      "amount",
      "occurredOn",
      "categoryId",
      "note",
    )
    assertThat(success.attempts).extracting<Int> { it.attemptNumber }.containsExactly(1, 1, 1, 1, 1)
    assertThat(success.attempts).extracting<String> { it.promptVariant.name.lowercase() }.containsExactly(
      "primary",
      "primary",
      "primary",
      "primary",
      "primary",
    )
    assertThat(success.attempts[2].status).isEqualTo(FieldInterpretationAttemptStatus.GENERATION_FAILED)
    assertThat(success.attempts[2].failureCode).isEqualTo(InterpretationFailureCode.INFERENCE_FAILED)
    assertThat(success.attempts[2].phase).isEqualTo(StructuredGenerationFailurePhase.GENERATION)
    assertThat(success.attempts[2].raw).isNull()
    assertThat(success.result.fields[2].interpretation).isEqualTo(FieldInterpretation.Missing)
    assertThat(success.result.issues).containsExactly(
      dev.solidcoder.interpretation.domain.InterpretationIssue(
        code = "field_generation_timeout",
        message = "The local interpreter timed out for this field.",
        level = dev.solidcoder.interpretation.domain.InterpretationIssueLevel.WARNING,
        fieldKey = FieldKey.of("occurredOn"),
      ),
    )
    assertThat(runtime.requests).hasSize(5)
    assertThat(runtime.requests.map { it.promptVariant }).containsExactly(
      FieldPromptVariant.PRIMARY,
      FieldPromptVariant.PRIMARY,
      FieldPromptVariant.PRIMARY,
      FieldPromptVariant.PRIMARY,
      FieldPromptVariant.PRIMARY,
    )
    assertThat(runtime.requests.count { it.fieldKey == "occurredOn" }).isEqualTo(1)
    assertThat(promptCompiler.fields).extracting<String> { it.key.value }.containsExactly(
      "type",
      "amount",
      "occurredOn",
      "categoryId",
      "note",
    )
  }

  @Test
  fun `uses the provided field processing order while keeping the final result in spec order`() = runBlocking {
    val spec = movementSpec()
    val orderedKeys = listOf("amount", "type", "categoryId", "note", "occurredOn")
    val interpreter = OnDeviceInputInterpreter(
      promptCompiler = RecordingPromptCompiler(),
      runtime = ScriptedRuntime(spec.fields.associate { field -> field.key.value to field.key.value }),
      resultDecoder = ScriptedDecoder(
        interpretationsByFieldKey = mapOf(
          "type" to resolvedEnum("expense"),
          "amount" to resolvedDecimal("20"),
          "occurredOn" to FieldInterpretation.Missing,
          "categoryId" to resolvedEnum("transport"),
          "note" to resolvedText("Gasolina 95"),
        ),
      ),
      fieldProcessingOrder = FieldProcessingOrder { interpretationSpec ->
        orderedKeys.map { key -> requireNotNull(interpretationSpec.fields.firstOrNull { it.key.value == key }) }
      },
    )

    val outcome = interpreter.interpret(request(spec))

    assertThat(outcome).isInstanceOf(InterpretationOutcome.Success::class.java)
    val success = outcome as InterpretationOutcome.Success
    assertThat(success.attempts).extracting<String> { it.fieldKey.value }.containsExactly(
      "amount",
      "type",
      "categoryId",
      "note",
      "occurredOn",
    )
    assertThat(success.attempts).extracting<Int> { it.fieldIndex }.containsExactly(1, 0, 4, 3, 2)
    assertThat(success.result.fields).extracting<String> { it.key.value }.containsExactly(
      "type",
      "amount",
      "occurredOn",
      "categoryId",
      "note",
    )
  }

  private class MutableClock(
    private var nowMs: Long = 0L,
  ) : InterpretationClock {
    override fun nowMillis(): Long = nowMs

    fun advanceBy(deltaMs: Long) {
      nowMs += deltaMs
    }
  }

  private fun request(spec: InterpretationSpec, input: String = "20 euros de gasolina 95"): InterpretationRequest = InterpretationRequest(
    input = UnstructuredText.of(input),
    inputLanguage = "es",
    spec = spec,
  )

  private fun movementSpec(): InterpretationSpec = InterpretationSpec(
    id = InterpretationSpecId.of("gonezo-movement-entry"),
    version = InterpretationSpecVersion.of("1"),
    fields = listOf(
      FieldSpec(
        key = FieldKey.of("type"),
        description = FieldDescription.of("Financial direction expressed by the user"),
        type = FieldType.ENUM,
        allowedValues = listOf(
          AllowedValue("expense", "Expense"),
          AllowedValue("income", "Income"),
        ),
      ),
      FieldSpec(
        key = FieldKey.of("amount"),
        description = FieldDescription.of("Monetary amount explicitly mentioned by the user"),
        type = FieldType.DECIMAL,
      ),
      FieldSpec(
        key = FieldKey.of("occurredOn"),
        description = FieldDescription.of("Date when the event happened"),
        type = FieldType.DATE,
        required = true,
        format = "local-date",
      ),
      FieldSpec(
        key = FieldKey.of("categoryId"),
        description = FieldDescription.of("Best matching category identifier among the supplied category candidates"),
        type = FieldType.ENUM,
        allowedValues = listOf(
          AllowedValue("transport", "Transport"),
          AllowedValue("food", "Food"),
        ),
      ),
      FieldSpec(
        key = FieldKey.of("note"),
        description = FieldDescription.of("Short note describing the movement"),
        type = FieldType.TEXT,
      ),
    ),
  )

  private fun resolvedEnum(stableValue: String): FieldInterpretation.Resolved = FieldInterpretation.Resolved(
    candidate = candidate(StructuredValue.Enum(stableValue), 0.98),
  )

  private fun resolvedDecimal(value: String): FieldInterpretation.Resolved = FieldInterpretation.Resolved(
    candidate = candidate(StructuredValue.Decimal(BigDecimal(value)), 0.98),
  )

  private fun resolvedText(value: String): FieldInterpretation.Resolved = FieldInterpretation.Resolved(
    candidate = candidate(StructuredValue.Text(value), 0.98),
  )

  private fun candidate(value: StructuredValue, confidence: Double): FieldCandidate = FieldCandidate(
    value = value,
    confidence = Confidence.of(confidence),
  )

  private class RecordingPromptCompiler : FieldInterpretationPromptCompiler {
    val fields = mutableListOf<FieldSpec>()
    val previousViolations = mutableListOf<FieldOutputViolation?>()

    override fun compile(
      request: InterpretationRequest,
      field: FieldSpec,
      variant: FieldPromptVariant,
      previousViolation: FieldOutputViolation?,
    ): StructuredGenerationRequest {
      fields += field
      previousViolations += previousViolation
      return StructuredGenerationRequest(
        prompt = "field=${field.key.value};type=${field.type.name.lowercase()};variant=${variant.name.lowercase()}",
        spec = request.spec,
      )
    }
  }

  private class ScriptedRuntime(
    private val outputsByFieldKey: Map<String, String>,
    private val outputsByFieldKeySequence: Map<String, List<String>> = emptyMap(),
    private val failureByFieldKey: Map<String, StructuredGenerationException> = emptyMap(),
    private val onGenerate: suspend (String) -> Unit = {},
  ) : StructuredGenerationRuntime {
    val requests = mutableListOf<StructuredGenerationRequest>()
    var invocations = 0
    var maxActive = 0
    private var active = 0
    private val invocationCounts = mutableMapOf<String, Int>()

    override suspend fun generate(request: StructuredGenerationRequest): StructuredGenerationResult {
      invocations += 1
      requests += request
      active += 1
      maxActive = maxOf(maxActive, active)
      try {
        val fieldKey = fieldKey(request.prompt)
        val invocationIndex = invocationCounts.getOrDefault(fieldKey, 0)
        invocationCounts[fieldKey] = invocationIndex + 1
        onGenerate(fieldKey)
        failureByFieldKey[fieldKey]?.let { throw it }
        val output = outputsByFieldKeySequence[fieldKey]?.getOrNull(invocationIndex)
          ?: outputsByFieldKey.getValue(fieldKey)
        return StructuredGenerationResult(output)
      } finally {
        active -= 1
      }
    }

    private fun fieldKey(prompt: String): String {
      val match = Regex("""field=([a-zA-Z0-9]+)""").find(prompt)
      return requireNotNull(match?.groupValues?.get(1)) { "prompt did not include a field key" }
    }
  }

  private class ScriptedDecoder(
    private val interpretationsByFieldKey: Map<String, FieldInterpretation>,
  ) : FieldInterpretationResultDecoder {
    override fun decode(field: FieldSpec, generationResult: StructuredGenerationResult): FieldInterpretation {
      val interpretation = interpretationsByFieldKey.getValue(field.key.value)
      InterpretationResult.forSpec(
        spec = InterpretationSpec(
          id = InterpretationSpecId.of("field-interpretation"),
          version = InterpretationSpecVersion.of("1"),
          fields = listOf(field),
        ),
        fields = listOf(FieldResult(field.key, interpretation)),
      )
      return interpretation
    }
  }
}
