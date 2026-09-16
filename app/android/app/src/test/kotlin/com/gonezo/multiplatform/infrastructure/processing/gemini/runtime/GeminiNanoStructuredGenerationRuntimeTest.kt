package com.gonezo.multiplatform.infrastructure.processing.gemini.runtime

import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRequest
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class GeminiNanoStructuredGenerationRuntimeTest {
  @Test
  fun returnsTheProviderOutput() = runBlocking {
    val client = FakeClient(available = true, output = "{\"amount\":20}")

    val result = GeminiNanoStructuredGenerationRuntime(client).generate(request())

    assertEquals("{\"amount\":20}", result.output)
    assertEquals("extract amount", client.lastPrompt)
  }

  @Test
  fun reportsUnavailableModelAsRecoverableInitializationFailure() = runBlocking {
    val client = FakeClient(available = false, output = "unused")

    val exception = runCatching {
      GeminiNanoStructuredGenerationRuntime(client).generate(request())
    }.exceptionOrNull()

    assertEquals("MODEL_UNAVAILABLE", (exception as? dev.solidcoder.interpretation.application.port.generation.StructuredGenerationException)?.failureCode?.name)
    assertTrue((exception as? dev.solidcoder.interpretation.application.port.generation.StructuredGenerationException)?.recoverable == true)
  }

  @Test
  fun preservesProviderFailuresAsRecoverableGenerationFailures() = runBlocking {
    val client = FakeClient(available = true, failure = IllegalStateException("provider failure"))

    val exception = runCatching {
      GeminiNanoStructuredGenerationRuntime(client).generate(request())
    }.exceptionOrNull()

    assertEquals("INFERENCE_FAILED", (exception as? dev.solidcoder.interpretation.application.port.generation.StructuredGenerationException)?.failureCode?.name)
  }

  private fun request() = StructuredGenerationRequest(
    prompt = "extract amount",
    spec = InterpretationSpec(
      id = InterpretationSpecId.of("voice"),
      version = InterpretationSpecVersion.of("1"),
      fields = listOf(FieldSpec(FieldKey.of("amount"), FieldDescription.of("Amount"), FieldType.DECIMAL)),
    ),
  )

  private class FakeClient(
    private val available: Boolean,
    private val output: String = "",
    private val failure: RuntimeException? = null,
  ) : GeminiNanoGenerationClient {
    var lastPrompt: String? = null

    override suspend fun isAvailable(): Boolean = available

    override suspend fun generate(prompt: String): String {
      lastPrompt = prompt
      failure?.let { throw it }
      return output
    }

    override fun close() = Unit
  }
}
