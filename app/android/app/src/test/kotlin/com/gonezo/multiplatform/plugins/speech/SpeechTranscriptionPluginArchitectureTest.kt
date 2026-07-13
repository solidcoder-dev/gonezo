package com.gonezo.multiplatform.plugins.speech

import java.nio.file.Path
import kotlin.io.path.readText
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SpeechTranscriptionPluginArchitectureTest {
  @Test
  fun pluginUsesTheRuntimeStateReaderAndKeepsTheCancellationBarrier() {
    val file = Path.of("src/main/kotlin/com/gonezo/multiplatform/plugins/speech/SpeechTranscriptionPlugin.kt")
    val source = file.readText()

    assertTrue(source.contains("CountDownLatch"))
    assertTrue(source.contains("transcription-cancellation-failed"))
    assertTrue(source.contains("CANCELLATION_TIMEOUT_SECONDS"))
    assertTrue(source.contains("cancelRequested"))
    assertTrue(source.contains("SpeechModelConfigurationReader"))
    assertTrue(source.contains("SpeechTranscriptionRuntimeState"))
    assertFalse(source.contains("requireModelSize"))
    assertFalse(source.contains("getLong(\"gonezo.speech.model.size\""))
  }
}
