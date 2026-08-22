package com.gonezo.multiplatform.plugins.interpretation.worker

import com.gonezo.multiplatform.infrastructure.ml.MlExecutionPlan
import com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget
import com.gonezo.multiplatform.infrastructure.processing.factory.ProcessingAssembly
import com.gonezo.multiplatform.infrastructure.processing.litert.model.InterpretationModelConfiguration
import com.gonezo.multiplatform.infrastructure.processing.preparation.ProcessingPreparer
import dev.solidcoder.interpretation.application.port.InputInterpreter
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRequest
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationResult
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRuntime
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test
import java.util.concurrent.atomic.AtomicInteger

class WorkerProcessingOwnerTest {
  @Test
  fun `prepare and generate use the same worker runtime instance`() = runBlocking {
    val runtime = RecordingRuntime()
    val assembly = ProcessingAssembly(
      inputInterpreter = object : InputInterpreter {
        override suspend fun interpret(request: dev.solidcoder.interpretation.application.InterpretationRequest): dev.solidcoder.interpretation.application.InterpretationOutcome =
          error("not used")
      },
      runtime = runtime,
      configuration = configuration(),
      executionPlan = MlExecutionPlan(MlExecutionTarget.CPU, MlExecutionTarget.NPU),
    )
    val owner = WorkerProcessingOwner(assembly)

    owner.prepare()
    owner.generate(StructuredGenerationRequest("prompt", emptySpec()))

    assertSame(runtime, owner.runtime)
    assertEquals(1, runtime.prepareCalls.get())
    assertEquals(1, runtime.generateCalls.get())
    owner.close()
    assertEquals(1, runtime.closeCalls.get())
  }

  private class RecordingRuntime : StructuredGenerationRuntime, ProcessingPreparer, java.io.Closeable {
    val prepareCalls = AtomicInteger()
    val generateCalls = AtomicInteger()
    val closeCalls = AtomicInteger()

    override suspend fun prepare() { prepareCalls.incrementAndGet() }

    override suspend fun generate(request: StructuredGenerationRequest): StructuredGenerationResult {
      generateCalls.incrementAndGet()
      return StructuredGenerationResult("{}")
    }

    override fun close() { closeCalls.incrementAndGet() }
  }

  private fun configuration() = InterpretationModelConfiguration(
    modelId = "model",
    modelVersion = "version",
    assetPath = "asset",
    fileName = "model.litertlm",
    expectedSizeBytes = 1,
    sha256 = "hash",
  )

  private fun emptySpec() = dev.solidcoder.interpretation.domain.InterpretationSpec(
    id = dev.solidcoder.interpretation.domain.InterpretationSpecId.of("test"),
    version = dev.solidcoder.interpretation.domain.InterpretationSpecVersion.of("1"),
    fields = listOf(
      dev.solidcoder.interpretation.domain.FieldSpec(
        key = dev.solidcoder.interpretation.domain.FieldKey.of("field"),
        description = dev.solidcoder.interpretation.domain.FieldDescription.of("field"),
        type = dev.solidcoder.interpretation.domain.FieldType.TEXT,
        allowedValues = emptyList(),
      ),
    ),
  )
}
