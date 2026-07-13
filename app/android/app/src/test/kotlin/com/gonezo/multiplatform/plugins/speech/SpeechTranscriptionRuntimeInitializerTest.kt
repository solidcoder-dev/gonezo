package com.gonezo.multiplatform.plugins.speech

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SpeechTranscriptionRuntimeInitializerTest {
  @Test
  fun returnsReadyStateWhenTheConfigurationIsValid() {
    var transcriberFactoryCalled = false
    val initializer = SpeechTranscriptionRuntimeInitializer(
      configurationReader = SpeechModelConfigurationReader {
        when (it) {
          "gonezo.speech.model.asset" -> "speech-transcription/whisper/ggml-tiny.bin"
          "gonezo.speech.model.size" -> 77691713
          "gonezo.speech.model.sha256" -> VALID_SHA
          else -> null
        }
      },
      transcriberFactory = { configuration ->
        transcriberFactoryCalled = true
        createTranscriber(configuration)
      },
    )

    val state = initializer.initialize()

    assertTrue(state is SpeechTranscriptionRuntimeState.Ready)
    assertTrue(transcriberFactoryCalled)
  }

  @Test
  fun returnsUnavailableStateWhenTheConfigurationIsInvalidWithoutThrowing() {
    var transcriberFactoryCalled = false
    val initializer = SpeechTranscriptionRuntimeInitializer(
      configurationReader = SpeechModelConfigurationReader {
        throw SpeechModelConfigurationException("Speech model metadata is invalid: gonezo.speech.model.size")
      },
      transcriberFactory = {
        transcriberFactoryCalled = true
        createTranscriber(it)
      },
    )

    val state = initializer.initialize()

    assertTrue(state is SpeechTranscriptionRuntimeState.Unavailable)
    assertEquals(
      SpeechTranscriptionFailureCodes.MODEL_UNAVAILABLE,
      (state as SpeechTranscriptionRuntimeState.Unavailable).issue.code,
    )
    assertTrue(!transcriberFactoryCalled)
  }

  private fun createTranscriber(configuration: SpeechModelConfiguration): WhisperCppTranscriber {
    return WhisperCppTranscriber(
      sourceResolver = { error("Not used") },
      modelProvider = object : ModelProvider {
        override fun modelPath(): String = configuration.assetPath
      },
      nativeBridge = object : WhisperNativeBridgeApi {
        override fun initContext(modelPath: String): Long = 1L
        override fun freeContext(context: Long) = Unit
        override fun isMultilingual(context: Long): Boolean = true
        override fun languageId(language: String): Int = 0
        override fun transcribe(
          context: Long,
          threads: Int,
          language: String?,
          detectLanguageAutomatically: Boolean,
          samples: FloatArray,
        ): String = """{"text":"hola","segments":{"text":["hola"],"startMs":[0],"endMs":[1],"noSpeechProbability":[0.1]}}"""
        override fun cancel(context: Long) = Unit
      },
      threadCount = 1,
    )
  }

  companion object {
    private const val VALID_SHA = "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21"
  }
}
