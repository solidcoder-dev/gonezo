package com.gonezo.multiplatform.plugins.interpretation.bootstrap

import dev.solidcoder.interpretation.application.InputInterpreter
import dev.solidcoder.interpretation.application.FieldInterpretationPromptCompiler
import dev.solidcoder.interpretation.application.InterpretationRequest
import dev.solidcoder.interpretation.application.FieldInterpretationResultDecoder
import dev.solidcoder.interpretation.application.OnDeviceInputInterpreter
import dev.solidcoder.interpretation.application.FieldPromptVariant
import dev.solidcoder.interpretation.application.FieldOutputViolation
import dev.solidcoder.interpretation.application.StructuredGenerationRequest
import dev.solidcoder.interpretation.application.StructuredGenerationResult
import dev.solidcoder.interpretation.application.StructuredGenerationRuntime
import dev.solidcoder.interpretation.application.UnstructuredText
import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.InterpretationContext
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import org.junit.Assert.assertFalse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import kotlinx.coroutines.runBlocking

class SchemaGuidedInterpretationCompositionRootTest {
  @Test
  fun `builds an on device input interpreter and reuses a single runtime`() {
    val runtime = RecordingRuntime()
    val root = SchemaGuidedInterpretationCompositionRoot(
      runtimeAssembly = RuntimeAssembly(runtime, configuration(), runtime),
      promptCompiler = RecordingPromptCompiler(),
      resultDecoder = RecordingDecoder(),
      fieldProcessingOrder = GonezoFieldProcessingOrder,
    )

    val first = root.createInputInterpreter()
    val second = root.createInputInterpreter()

    assertTrue(first is OnDeviceInputInterpreter)
    assertTrue(second is OnDeviceInputInterpreter)
    assertSame(runtime, root.runtime)
    val outcome = runBlocking {
      (first as OnDeviceInputInterpreter).interpret(
        InterpretationRequest(
          input = UnstructuredText.of("20 euros de gasolina 95"),
          inputLanguage = "es",
          spec = movementSpec(),
          context = InterpretationContext(emptyList()),
        ),
      )
    }
    assertTrue(outcome is dev.solidcoder.interpretation.application.InterpretationOutcome.Success)
    assertEquals(listOf("prompt-amount", "prompt-type", "prompt-categoryId", "prompt-note", "prompt-occurredOn"), runtime.prompts)
    assertEquals(listOf("type", "amount", "occurredOn", "categoryId", "note"), (outcome as dev.solidcoder.interpretation.application.InterpretationOutcome.Success).result.fields.map { it.key.value })
    root.close()
    root.close()
    assertTrue(runtime.closed)
  }

  @Test
  fun `does not reference the heuristic interpreter`() {
    val source = File("src/main/kotlin/com/gonezo/multiplatform/plugins/interpretation/bootstrap/SchemaGuidedInterpretationCompositionRoot.kt").readText()

    assertTrue(source.contains("LiteRtStructuredGenerationRuntime"))
    assertTrue(source.contains("JsonFieldInterpretationPromptCompiler"))
    assertTrue(source.contains("JsonFieldInterpretationResultDecoder"))
    assertTrue(source.contains("AndroidInterpretationModelStore"))
    assertTrue(source.contains("InterpretationModelConfigurationReader"))
    assertTrue(source.contains("context.applicationContext"))
    assertFalse(source.contains(listOf("GonezoMovementEntry", "Heu", "ristic", "InputInterpreter").joinToString("")))
  }

  private fun configuration() = com.gonezo.multiplatform.plugins.interpretation.model.InterpretationModelConfiguration(
    modelId = "litert-community/Gemma3-1B-IT",
    modelVersion = "dynamic-int4-q4-ekv4096",
    assetPath = "schema-guided-interpretation/litertlm/Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm",
    fileName = "Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm",
    expectedSizeBytes = 584417280L,
    sha256 = "1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be",
  )

  private class RecordingRuntime : StructuredGenerationRuntime, java.io.Closeable {
    var closed = false
    val prompts = mutableListOf<String>()

    override suspend fun generate(request: StructuredGenerationRequest): StructuredGenerationResult {
      prompts += request.prompt
      return StructuredGenerationResult("""{"kind":"missing"}""")
    }

    override fun close() {
      closed = true
    }
  }

  private class RecordingPromptCompiler : FieldInterpretationPromptCompiler {
    override fun compile(
      request: InterpretationRequest,
      field: FieldSpec,
      variant: FieldPromptVariant,
      previousViolation: FieldOutputViolation?,
    ): StructuredGenerationRequest =
      StructuredGenerationRequest("prompt-${field.key.value}", request.spec)
  }

  private class RecordingDecoder : FieldInterpretationResultDecoder {
    override fun decode(field: FieldSpec, generationResult: StructuredGenerationResult): FieldInterpretation {
      return FieldInterpretation.Missing
    }
  }

  private fun movementSpec(): InterpretationSpec = InterpretationSpec(
    id = InterpretationSpecId.of("gonezo-movement-entry"),
    version = InterpretationSpecVersion.of("1"),
    fields = listOf(
      field("type"),
      field("amount"),
      field("occurredOn"),
      field("categoryId"),
      field("note"),
    ),
  )

  private fun field(key: String): FieldSpec = FieldSpec(
    key = dev.solidcoder.interpretation.domain.FieldKey.of(key),
    description = dev.solidcoder.interpretation.domain.FieldDescription.of(key),
    type = when (key) {
      "amount" -> dev.solidcoder.interpretation.domain.FieldType.DECIMAL
      "occurredOn" -> dev.solidcoder.interpretation.domain.FieldType.DATE
      "categoryId" -> dev.solidcoder.interpretation.domain.FieldType.ENUM
      "note" -> dev.solidcoder.interpretation.domain.FieldType.TEXT
      else -> dev.solidcoder.interpretation.domain.FieldType.ENUM
    },
    allowedValues = if (key == "categoryId" || key == "type") {
      listOf(
        dev.solidcoder.interpretation.domain.AllowedValue("expense", "Expense"),
        dev.solidcoder.interpretation.domain.AllowedValue("income", "Income"),
      )
    } else {
      emptyList()
    },
  )
}
