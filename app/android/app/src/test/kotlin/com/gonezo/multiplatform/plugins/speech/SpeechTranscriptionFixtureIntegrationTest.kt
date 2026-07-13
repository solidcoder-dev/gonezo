package com.gonezo.multiplatform.plugins.speech

import com.gonezo.multiplatform.plugins.speech.preprocessing.EnergyBasedSpeechAudioPreprocessor
import com.gonezo.multiplatform.plugins.speech.preprocessing.SpeechAudioPreparation
import com.gonezo.multiplatform.plugins.speech.preprocessing.SpeechAudioPreprocessor
import dev.solidcoder.speech.AudioSourceRef
import dev.solidcoder.speech.TranscriptionRequest
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SpeechTranscriptionFixtureIntegrationTest {
  @Test
  fun silenceFixtureIsRejectedBeforeWhisper() {
    val result = transcribeFixture("silence.wav")

    assertFailure(result, "no-speech-detected")
  }

  @Test
  fun lowNoiseFixtureIsRejectedBeforeWhisper() {
    val result = transcribeFixture("low-noise.wav")

    assertFailure(result, "no-speech-detected")
  }

  @Test
  fun spanishSpeechFixtureInvokesSpanishTranscriptionAndPreservesUtf8() {
    val bridge = FakeWhisperNativeBridge(
      transcribeJson = """{"text":"Gasté 34,80 € en alimentación y piña","segments":{"text":["Gasté","34,80 €","en alimentación","y piña"],"startMs":[0,100,200,300],"endMs":[100,200,300,400],"noSpeechProbability":[0.1,0.1,0.1,0.1]}}""",
    )
    val audioFile = fixtureFile("spanish-speech-with-silence.wav")
    val transcriber = WhisperCppTranscriber(
      sourceResolver = { audioFile },
      modelProvider = object : ModelProvider {
        override fun modelPath(): String = "speech-transcription/whisper/ggml-tiny.bin"
      },
      pcmDecoder = WavPcmDecoder(),
      audioPreprocessor = EnergyBasedSpeechAudioPreprocessor(),
      nativeBridge = bridge,
      threadCount = 1,
    )

    val result = transcriber.transcribeBlocking(request())

    assertTrue(result.isSuccess)
    assertEquals("es", bridge.lastLanguage)
    assertFalse(bridge.detectLanguageAutomatically)
    assertEquals("Gasté 34,80 € en alimentación y piña", result.transcript!!.text)
    assertNotNull(result.transcript!!.segments)
    assertTrue(result.transcript!!.text.contains("€"))
    assertTrue(result.transcript!!.text.contains("ñ"))
  }

  private fun transcribeFixture(name: String): dev.solidcoder.speech.TranscriptionResult {
    val audioFile = fixtureFile(name)
    val transcriber = WhisperCppTranscriber(
      sourceResolver = { audioFile },
      modelProvider = object : ModelProvider {
        override fun modelPath(): String = "speech-transcription/whisper/ggml-tiny.bin"
      },
      pcmDecoder = WavPcmDecoder(),
      audioPreprocessor = EnergyBasedSpeechAudioPreprocessor(),
      nativeBridge = FakeWhisperNativeBridge(),
      threadCount = 1,
    )

    return transcriber.transcribeBlocking(request())
  }

  private fun request(): TranscriptionRequest {
    return TranscriptionRequest(
      audioSource = AudioSourceRef.of("11111111-1111-1111-1111-111111111111"),
      language = "es",
      detectLanguageAutomatically = false,
    )
  }

  private fun fixtureFile(name: String): File {
    val resource = javaClass.getResourceAsStream("/com/gonezo/multiplatform/plugins/speech/$name")
      ?: error("Missing audio fixture: $name")
    val file = File.createTempFile("gonezo-$name", ".wav")
    file.outputStream().use { output ->
      resource.use { input -> input.copyTo(output) }
    }
    file.deleteOnExit()
    return file
  }

  private fun assertFailure(result: dev.solidcoder.speech.TranscriptionResult, code: String) {
    assertFalse(result.isSuccess)
    assertEquals(code, result.issues.single().code)
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
