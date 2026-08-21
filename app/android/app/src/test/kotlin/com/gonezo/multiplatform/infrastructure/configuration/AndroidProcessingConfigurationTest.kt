package com.gonezo.multiplatform.infrastructure.configuration

import com.gonezo.multiplatform.infrastructure.processing.factory.ProcessingFactory
import dev.solidcoder.interpretation.application.SpecFieldProcessingOrder
import dev.solidcoder.interpretation.json.JsonFieldInterpretationPromptCompiler
import dev.solidcoder.interpretation.json.JsonFieldInterpretationResultDecoder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class AndroidProcessingConfigurationTest {
  private val reader = AndroidProcessingConfigurationReader()

  @Test
  fun parsesTheSupportedDefaultValues() {
    val configuration = reader.read(" full ", "whisper_cpp", " LOCAL_LITERT ")

    assertEquals(TranscriptionMode.FULL, configuration.transcriptionMode)
    assertEquals(TranscriptionProvider.WHISPER_CPP, configuration.transcriptionProvider)
    assertEquals(ProcessingProvider.LOCAL_LITERT, configuration.processingProvider)
  }

  @Test
  fun parsesStreamingModeForWhisperCpp() {
    assertEquals(
      TranscriptionMode.STREAMING,
      reader.read("STREAMING", "WHISPER_CPP", "LOCAL_LITERT").transcriptionMode,
    )
  }

  @Test
  fun rejectsUnknownValuesExplicitly() {
    val exception = assertThrows(AndroidProcessingConfigurationException::class.java) {
      reader.read("FULL", "WHISPR", "LOCAL_LITERT")
    }

    assertEquals("gonezoTranscriptionProvider has unsupported value 'WHISPR'.", exception.message)
  }

  @Test
  fun keepsStreamingModeAsAnExplicitWhisperCppSelection() {
    val configuration = reader.read("STREAMING", "WHISPER_CPP", "LOCAL_LITERT")

    assertEquals(TranscriptionMode.STREAMING, configuration.transcriptionMode)
    assertEquals(TranscriptionProvider.WHISPER_CPP, configuration.transcriptionProvider)
  }

  @Test
  fun rejectsRemoteProcessingWithoutFallback() {
    val configuration = reader.read("FULL", "WHISPER_CPP", "REMOTE")

    val exception = assertThrows(IllegalArgumentException::class.java) {
      ProcessingFactory(
        context = null,
        configuration = configuration,
        promptCompiler = JsonFieldInterpretationPromptCompiler(),
        resultDecoder = JsonFieldInterpretationResultDecoder(),
        fieldProcessingOrder = SpecFieldProcessingOrder,
      ).create()
    }

    assertEquals("Processing provider REMOTE is not implemented yet", exception.message)
  }
}
