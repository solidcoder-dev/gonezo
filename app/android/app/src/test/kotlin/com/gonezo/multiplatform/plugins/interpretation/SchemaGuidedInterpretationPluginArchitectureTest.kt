package com.gonezo.multiplatform.plugins.interpretation

import java.nio.file.Path
import kotlin.io.path.readText
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SchemaGuidedInterpretationPluginArchitectureTest {
  @Test
  fun pluginDelegatesThroughTheNewUseCaseAndDoesNotReferenceTheOldRuntime() {
    val file = Path.of("src/main/kotlin/com/gonezo/multiplatform/plugins/interpretation/SchemaGuidedInterpretationPlugin.kt")
    val source = file.readText()

    assertTrue(source.contains("ExecuteSchemaGuidedInterpretation"))
    assertTrue(source.contains("SchemaGuidedInterpretationCompositionRoot"))
    assertTrue(source.contains("compositionRoot.close()"))
    assertTrue(source.contains("interpretation-cancellation-failed"))
    assertTrue(source.contains("unsupported_device"))
    assertTrue(source.contains("model_corrupt"))
    assertTrue(source.contains("malformed_output"))
    assertTrue(source.contains("inference_failed"))
    assertTrue(source.contains("requireRunId(call)"))
    assertTrue(source.contains("executeInterpretation.execute(requestJson)"))
    assertTrue(source.contains("artifactStore.storeInterpretation("))
    assertTrue(source.contains("execution.resultJson"))
    assertTrue(source.contains("execution.attempts"))
    assertFalse(source.contains("interpretation_failed"))
    assertFalse(source.contains(listOf("RuleBased", "Schema", "Interpreter").joinToString("")))
    assertFalse(source.contains(listOf("GonezoMovementEntry", "Heu", "ristic", "InputInterpreter").joinToString("")))
    assertFalse(source.contains(listOf("GonezoMovementEntry", "Heu", "ristic", "InputInterpreter", "()").joinToString("")))
  }
}
