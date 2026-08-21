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

  @Test
  fun rejectsASecondSessionUntilTheFirstSessionIsClosed() {
    val transcriber = transcriber(FakeBridge())
    val first = transcriber.startBlocking(StreamingTranscriptionRequest())

    assertThrows(IllegalStateException::class.java) {
      transcriber.startBlocking(StreamingTranscriptionRequest())
    }

    first.cancelBlocking()
    transcriber.startBlocking(StreamingTranscriptionRequest()).cancelBlocking()
    transcriber.close()
  }

  @Test
  fun slowInferenceMakesQueueExhaustionAnExplicitFailure() {
    val bridge = FakeBridge().also { it.blockInference = true }
    val session = transcriber(bridge).startBlocking(StreamingTranscriptionRequest())
    session.acceptPcm16NonBlocking(ByteArray(64_000), 64_000)
    assertTrue(bridge.firstInference.await(1, TimeUnit.SECONDS))

    repeat(32) {
      session.acceptPcm16NonBlocking(ByteArray(2), 2)
    }
    assertThrows(StreamingAudioBackpressureException::class.java) {
      session.acceptPcm16NonBlocking(ByteArray(2), 2)
    }

    bridge.blockInference = false
    session.cancelBlocking()
  }

  private fun transcriber(bridge: FakeBridge) = WhisperCppStreamingTranscriber(
    modelProvider = object : ModelProvider {
      override fun modelPath(): String = "model.bin"
    },
    nativeBridge = bridge,
    threadCount = 1,
  )

  private class FakeBridge : WhisperNativeBridgeApi {
    var initCalls = 0
    var transcribeCalls = 0
    val firstInference = CountDownLatch(1)
    var blockInference = false

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
      while (blockInference) Thread.yield()
      return """{"text":"hola","segments":{"text":["hola"],"startMs":[0],"endMs":[100],"noSpeechProbability":[0.1]}}"""
    }

    override fun cancel(context: Long) = Unit
  }
}
