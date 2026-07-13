package com.gonezo.multiplatform.plugins.speech

import com.gonezo.multiplatform.plugins.speech.preprocessing.SpeechAudioPreparation
import com.gonezo.multiplatform.plugins.speech.preprocessing.SpeechAudioPreprocessor
import dev.solidcoder.speech.AudioSourceRef
import dev.solidcoder.speech.TranscriptionResult
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WhisperCppTranscriberTest {
  @Test
  fun noSpeechBeforeWhisperDoesNotCallTheNativeBridge() {
    val bridge = FakeWhisperNativeBridge()
    val transcriber = newTranscriber(
      bridge = bridge,
      preprocessor = object : SpeechAudioPreprocessor {
        override fun prepare(audio: PcmAudio): SpeechAudioPreparation = SpeechAudioPreparation.NoSpeech
      },
    )

    val result = transcriber.transcribeBlocking(request())

    assertFailure(result, "no-speech-detected", true)
    assertFalse(bridge.transcribeCalled)
  }

  @Test
  fun rejectsUnsupportedLanguagesBeforeWhisper() {
    val bridge = FakeWhisperNativeBridge(configuredLanguageId = -1)
    val transcriber = newTranscriber(
      bridge = bridge,
      preprocessor = readyPreprocessor(),
    )

    val result = transcriber.transcribeBlocking(request(language = "fr"))

    assertFailure(result, "unsupported-transcription-language", false)
    assertFalse(bridge.transcribeCalled)
  }

  @Test
  fun rejectsEnglishOnlyModelsForSpanishRequests() {
    val bridge = FakeWhisperNativeBridge(multilingual = false)
    val transcriber = newTranscriber(
      bridge = bridge,
      preprocessor = readyPreprocessor(),
      modelPath = "speech-transcription/whisper/ggml-tiny.en.bin",
    )

    val result = transcriber.transcribeBlocking(request())

    assertFailure(result, "unsupported-transcription-language", false)
    assertFalse(bridge.transcribeCalled)
  }

  @Test
  fun filtersSilentSegmentsAndNormalizesTheTranscript() {
    val bridge = FakeWhisperNativeBridge(
      transcribeJson = """{"text":"Gasté 34,80 € en alimentación","segments":{"text":["Gasté","34,80 €","en alimentación"],"startMs":[0,100,200],"endMs":[100,200,300],"noSpeechProbability":[0.1,0.61,0.2]}}""",
    )
    val transcriber = newTranscriber(
      bridge = bridge,
      preprocessor = readyPreprocessor(),
    )

    val result = transcriber.transcribeBlocking(request())

    assertTrue(result.isSuccess)
    assertEquals("Gasté en alimentación", result.transcript!!.text)
    assertEquals(2, result.transcript!!.segments.size)
    assertEquals("es", bridge.lastLanguage)
    assertFalse(bridge.detectLanguageAutomatically)
  }

  @Test
  fun rejectsCorruptTranscriptionOutput() {
    val bridge = FakeWhisperNativeBridge(
      transcribeJson = """{"text":"@@@@@@","segments":{"text":["@@@@@@"],"startMs":[0],"endMs":[100],"noSpeechProbability":[0.1]}}""",
    )
    val transcriber = newTranscriber(
      bridge = bridge,
      preprocessor = readyPreprocessor(),
    )

    val result = transcriber.transcribeBlocking(request())

    assertFailure(result, "transcription-invalid-output", true)
  }

  private fun request(language: String = "es"): dev.solidcoder.speech.TranscriptionRequest {
    return dev.solidcoder.speech.TranscriptionRequest(
      audioSource = AudioSourceRef.of("capture-1"),
      language = language,
      detectLanguageAutomatically = false,
    )
  }

  private fun readyPreprocessor(): SpeechAudioPreprocessor = object : SpeechAudioPreprocessor {
    override fun prepare(audio: PcmAudio): SpeechAudioPreparation = SpeechAudioPreparation.Ready(
      samples = floatArrayOf(0.1f, 0.2f, 0.3f),
      speechDurationMs = 300,
    )
  }

  private fun newTranscriber(
    bridge: FakeWhisperNativeBridge,
    preprocessor: SpeechAudioPreprocessor,
    modelPath: String = "speech-transcription/whisper/ggml-tiny.bin",
  ): WhisperCppTranscriber {
    val audioFile = File.createTempFile("gonezo-voice", ".wav").apply {
      writeBytes(byteArrayOf(0, 1, 2, 3))
      deleteOnExit()
    }
    return WhisperCppTranscriber(
      sourceResolver = { audioFile },
      modelProvider = object : ModelProvider {
        override fun modelPath(): String = modelPath
      },
      pcmDecoder = object : PcmDecoder {
        override fun decode(wavBytes: ByteArray): PcmAudio = PcmAudio(floatArrayOf(0.1f, 0.2f, 0.3f), 16_000)
      },
      audioPreprocessor = preprocessor,
      nativeBridge = bridge,
      threadCount = 1,
    )
  }

  private fun assertFailure(result: TranscriptionResult, code: String, recoverable: Boolean) {
    assertFalse(result.isSuccess)
    assertEquals(code, result.issues.single().code)
    assertEquals(recoverable, result.issues.single().recoverable)
  }

  private class FakeWhisperNativeBridge(
    var multilingual: Boolean = true,
    var configuredLanguageId: Int = 0,
    var transcribeJson: String = """{"text":"hola","segments":{"text":["hola"],"startMs":[0],"endMs":[100],"noSpeechProbability":[0.1]}}""",
  ) : WhisperNativeBridgeApi {
    var transcribeCalled = false
    var lastLanguage: String? = null
    var detectLanguageAutomatically: Boolean = false

    override fun initContext(modelPath: String): Long = 1L
    override fun freeContext(context: Long) = Unit
    override fun isMultilingual(context: Long): Boolean = multilingual
    override fun languageId(language: String): Int = configuredLanguageId
    override fun transcribe(context: Long, threads: Int, language: String?, detectLanguageAutomatically: Boolean, samples: FloatArray): String {
      transcribeCalled = true
      lastLanguage = language
      this.detectLanguageAutomatically = detectLanguageAutomatically
      return transcribeJson
    }
    override fun cancel(context: Long) = Unit
  }
}
