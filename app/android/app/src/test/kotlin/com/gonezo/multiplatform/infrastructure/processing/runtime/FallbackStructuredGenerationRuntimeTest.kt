package com.gonezo.multiplatform.infrastructure.processing.runtime

import dev.solidcoder.interpretation.application.FieldPromptVariant
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationException
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationFailurePhase
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRequest
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationResult
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRuntime
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class FallbackStructuredGenerationRuntimeTest {
  private val request = StructuredGenerationRequest("extract amount", sampleSpec(), promptVariant = FieldPromptVariant.PRIMARY)

  @Test
  fun returnsGeminiResultWithoutCallingLiteRt() = runBlocking {
    val preferred = FakeRuntime(StructuredGenerationResult("gemini"))
    val fallback = FakeRuntime(StructuredGenerationResult("litert"))

    val result = FallbackStructuredGenerationRuntime(preferred, fallback).generate(request)

    assertEquals("gemini", result.output)
    assertEquals(1, preferred.calls)
    assertEquals(0, fallback.calls)
  }

  @Test
  fun usesLiteRtForRecoverableGeminiFailure() = runBlocking {
    val preferred = FakeRuntime(failure(InterpretationFailureCode.MODEL_UNAVAILABLE))
    val fallback = FakeRuntime(StructuredGenerationResult("litert"))

    assertEquals("litert", FallbackStructuredGenerationRuntime(preferred, fallback).generate(request).output)
    assertEquals(1, fallback.calls)
  }

  @Test(expected = CancellationException::class)
  fun doesNotFallbackOnCancellation() {
    runBlocking {
      val preferred = FakeRuntime(CancellationException("cancelled"))
      val fallback = FakeRuntime(StructuredGenerationResult("litert"))

      FallbackStructuredGenerationRuntime(preferred, fallback).generate(request)
    }
  }

  @Test
  fun preservesTheStructuredGenerationRequestForThePreferredRuntime() = runBlocking {
    val preferred = RecordingRuntime(StructuredGenerationResult("gemini"))
    val fallback = FakeRuntime(StructuredGenerationResult("litert"))

    FallbackStructuredGenerationRuntime(preferred, fallback).generate(request)

    assertEquals(request, preferred.lastRequest)
  }

  private fun failure(code: InterpretationFailureCode): StructuredGenerationException = StructuredGenerationException(
    failureCode = code,
    recoverable = true,
    phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
    message = code.name,
  )

  private fun sampleSpec() = InterpretationSpec(
    id = InterpretationSpecId.of("voice"),
    version = InterpretationSpecVersion.of("1"),
    fields = listOf(FieldSpec(FieldKey.of("amount"), FieldDescription.of("Amount"), FieldType.DECIMAL)),
  )

  private class FakeRuntime(private val outcome: Any) : StructuredGenerationRuntime {
    var calls = 0

    override suspend fun generate(request: StructuredGenerationRequest): StructuredGenerationResult {
      calls++
      when (outcome) {
        is Throwable -> throw outcome
        is StructuredGenerationException -> throw outcome
      }
      return outcome as StructuredGenerationResult
    }
  }

  private class RecordingRuntime(private val result: StructuredGenerationResult) : StructuredGenerationRuntime {
    var lastRequest: StructuredGenerationRequest? = null

    override suspend fun generate(request: StructuredGenerationRequest): StructuredGenerationResult {
      lastRequest = request
      return result
    }
  }
}
