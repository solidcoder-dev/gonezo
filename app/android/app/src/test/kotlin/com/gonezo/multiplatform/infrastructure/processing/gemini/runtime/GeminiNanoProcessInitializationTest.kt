package com.gonezo.multiplatform.infrastructure.processing.gemini.runtime

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

class GeminiNanoProcessInitializationTest {
  @Test
  fun `initializes ML Kit before creating the Gemini Nano client`() {
    val source = File(
      "../../../platforms/android/infrastructure/src/main/java/com/gonezo/multiplatform/infrastructure/processing/gemini/runtime/GeminiNanoStructuredGenerationRuntime.kt",
    ).readText()

    assertTrue(source.contains("MlKit.initialize(context.applicationContext)"))
    assertTrue(source.indexOf("MlKit.initialize(context.applicationContext)") < source.indexOf("Generation.getClient()"))
  }
}
