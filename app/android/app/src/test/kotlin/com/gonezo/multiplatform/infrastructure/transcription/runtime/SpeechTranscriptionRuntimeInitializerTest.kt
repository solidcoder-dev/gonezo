package com.gonezo.multiplatform.infrastructure.transcription.runtime

import com.gonezo.multiplatform.infrastructure.transcription.model.ModelProvider
import com.gonezo.multiplatform.infrastructure.transcription.whisper.WhisperNativeBridgeApi
import com.gonezo.multiplatform.infrastructure.transcription.whisper.WhisperCppTranscriber
import org.junit.Assert.assertTrue
import org.junit.Test

class SpeechTranscriptionRuntimeInitializerTest {
  @Test
  fun returnsReadyStateWhenTheTranscriberCanBeCreated() {
    val state = SpeechTranscriptionRuntimeInitializer {
      createTranscriber()
    }.initialize()

    assertTrue(state is SpeechTranscriptionRuntimeState.Ready)
  }

  @Test
  fun returnsUnavailableStateWhenCreationFailsWithoutThrowing() {
    val state = SpeechTranscriptionRuntimeInitializer {
      error("model metadata is invalid")
    }.initialize()

    assertTrue(state is SpeechTranscriptionRuntimeState.Unavailable)
  }

  private fun createTranscriber(): WhisperCppTranscriber = WhisperCppTranscriber(
    sourceResolver = { error("Not used") },
    modelProvider = object : ModelProvider {
      override fun modelPath(): String = "speech-transcription/whisper/ggml-tiny.bin"
    },
    nativeBridge = object : WhisperNativeBridgeApi {
      override fun initContext(modelPath: String): Long = 1L
      override fun freeContext(context: Long) = Unit
      override fun isMultilingual(context: Long): Boolean = true
      override fun languageId(language: String): Int = 0
      override fun transcribe(context: Long, threads: Int, language: String?, detectLanguageAutomatically: Boolean, samples: FloatArray): String = "{}"
      override fun cancel(context: Long) = Unit
    },
  )
}
