package com.gonezo.multiplatform.infrastructure.transcription.whisper

import com.gonezo.multiplatform.infrastructure.transcription.model.ModelProvider
import dev.solidcoder.speech.AudioChunk
import dev.solidcoder.speech.StreamingTranscriptionRequest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class WhisperCppStreamingTranscriberTest {
  @Test
  fun processesAcceptedAudioBeforeFinishAndKeepsOneNativeContext() {
    val bridge = FakeBridge()
    val transcriber = WhisperCppStreamingTranscriber(
      modelProvider = object : ModelProvider {
        override fun modelPath(): String = "model.bin"
      },
      nativeBridge = bridge,
      threadCount = 1,
    )
    val session = transcriber.startBlocking(StreamingTranscriptionRequest(language = "es", detectLanguageAutomatically = false))

    session.acceptBlocking(AudioChunk(FloatArray(32_000) { 0.1f }, 16_000))
    assertTrue(bridge.firstInference.await(1, TimeUnit.SECONDS))
    val result = session.finishBlocking()

    assertEquals("hola", result.transcript?.text)
    assertEquals(1, bridge.initCalls)
    assertThrows(IllegalStateException::class.java) { session.finishBlocking() }
    transcriber.close()
  }

  private class FakeBridge : WhisperNativeBridgeApi {
    var initCalls = 0
    var transcribeCalls = 0
    val firstInference = CountDownLatch(1)

    override fun initContext(modelPath: String): Long {
      initCalls++
      return 1L
    }

    override fun freeContext(context: Long) = Unit
    override fun isMultilingual(context: Long): Boolean = true
    override fun languageId(language: String): Int = 0

    override fun transcribe(
      context: Long,
      threads: Int,
      language: String?,
      detectLanguageAutomatically: Boolean,
      samples: FloatArray,
    ): String {
      transcribeCalls++
      firstInference.countDown()
      return """{"text":"hola","segments":{"text":["hola"],"startMs":[0],"endMs":[100],"noSpeechProbability":[0.1]}}"""
    }

    override fun cancel(context: Long) = Unit
  }
}
