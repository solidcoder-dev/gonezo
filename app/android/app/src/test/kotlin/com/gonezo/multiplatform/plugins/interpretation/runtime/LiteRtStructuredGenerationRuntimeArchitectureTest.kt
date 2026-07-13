package com.gonezo.multiplatform.plugins.interpretation.runtime

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LiteRtStructuredGenerationRuntimeArchitectureTest {
  @Test
  fun `runtime stays field agnostic and does not import field specs`() {
    val source = File("src/main/kotlin/com/gonezo/multiplatform/plugins/interpretation/runtime/LiteRtStructuredGenerationRuntime.kt").readText()

    assertTrue(source.contains("engineMutex"))
    assertTrue(source.contains("generationMutex"))
    assertTrue(source.contains("cancelProcess()"))
    assertTrue(source.contains("maxNumTokens = MAX_NUM_TOKENS"))
    assertTrue(source.contains("automaticToolCalling = false"))
    assertTrue(source.contains("seed = 0"))
    assertFalse(source.contains("FieldSpec"))
    assertFalse(source.contains("amount"))
    assertFalse(source.contains("categoryId"))
    assertFalse(source.contains("occurredOn"))
    assertFalse(source.contains("note"))
  }
}
