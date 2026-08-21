package com.gonezo.multiplatform.infrastructure.transcription.orchestration

import android.content.Context
import com.gonezo.multiplatform.infrastructure.configuration.AndroidProcessingConfigurationReader
import com.gonezo.multiplatform.infrastructure.transcription.factory.TranscriberFactory
import com.gonezo.multiplatform.infrastructure.transcription.runtime.AndroidStreamingSpeechTranscriber
import com.gonezo.multiplatform.infrastructure.transcription.runtime.AndroidStreamingTranscriptionSession
import dev.solidcoder.speech.StreamingTranscriptionRequest
import dev.solidcoder.speech.TranscriptionResult

class StreamingAudioTranscriptionCoordinator(context: Context) : AutoCloseable {
  private val transcriber = TranscriberFactory(
    context = context,
    configuration = AndroidProcessingConfigurationReader().read(),
    sourceResolver = { error("streaming transcription does not resolve an audio file") },
  ).create() as? AndroidStreamingSpeechTranscriber
    ?: error("streaming transcription is not available")
  private var session: AndroidStreamingTranscriptionSession? = null

  @Synchronized
  fun start(language: String?, detectLanguageAutomatically: Boolean) {
    check(session == null) { "streaming transcription is already active" }
    session = transcriber.startBlocking(
      StreamingTranscriptionRequest(language, detectLanguageAutomatically),
    )
  }

  fun acceptPcm16(bytes: ByteArray, length: Int) {
    check(length in 1..bytes.size && length % 2 == 0) { "PCM16 chunk length must be a positive even number" }
    sessionOrThrow().acceptPcm16NonBlocking(bytes, length)
  }

  @Synchronized
  fun finish(): TranscriptionResult {
    val activeSession = checkNotNull(session) { "streaming transcription is not active" }
    return try {
      activeSession.finishBlocking()
    } finally {
      session = null
    }
  }

  @Synchronized
  fun cancel() {
    session?.cancelBlocking()
    session = null
  }

  override fun close() {
    cancel()
    transcriber.close()
  }

  @Synchronized
  private fun sessionOrThrow(): AndroidStreamingTranscriptionSession =
    checkNotNull(session) { "streaming transcription is not active" }
}
