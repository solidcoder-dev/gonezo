package com.gonezo.multiplatform.plugins.speech

import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import androidx.test.ext.junit.runners.AndroidJUnit4

@RunWith(AndroidJUnit4::class)
class SpeechModelConfigurationInstrumentedTest {
  @Test
  fun readsTheProductionMergedManifestConfiguration() {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val configuration = SpeechModelConfigurationReader(context).read()

    assertEquals(77691713L, configuration.expectedSize)
    assertEquals("speech-transcription/whisper/ggml-tiny.bin", configuration.assetPath)
    assertTrue(SHA256_PATTERN.matches(configuration.expectedSha256))
  }

  companion object {
    private val SHA256_PATTERN = Regex("^[a-f0-9]{64}$")
  }
}
