package com.gonezo.multiplatform.plugins.audio

import android.content.Context
import com.gonezo.multiplatform.infrastructure.configuration.AndroidProcessingConfigurationReader
import com.gonezo.multiplatform.infrastructure.transcription.factory.TranscriberFactory
import com.gonezo.multiplatform.infrastructure.transcription.runtime.AndroidStreamingSpeechTranscriber
import com.gonezo.multiplatform.infrastructure.transcription.runtime.AndroidStreamingTranscriptionSession
import dev.solidcoder.speech.AudioChunk
import dev.solidcoder.speech.StreamingTranscriptionRequest
import dev.solidcoder.speech.TranscriptionResult

internal class StreamingAudioTranscriptionController(context: Context) {
  private val transcriber: AndroidStreamingSpeechTranscriber
  private var session: AndroidStreamingTranscriptionSession? = null

  init {
    val configuration = AndroidProcessingConfigurationReader().read()
    transcriber = TranscriberFactory(context, configuration) { error("streaming does not resolve an audio file") }
      .create() as? AndroidStreamingSpeechTranscriber
      ?: error("streaming transcription is not available")
  }

  fun start(language: String?, detectLanguageAutomatically: Boolean) {
    check(session == null) { "streaming transcription is already active" }
    session = transcriber.startBlocking(
      StreamingTranscriptionRequest(language, detectLanguageAutomatically),
    )
  }

  fun acceptPcm16(bytes: ByteArray, length: Int) {
    val samples = FloatArray(length / 2)
    for (index in samples.indices) {
      val low = bytes[index * 2].toInt() and 0xff
      val high = bytes[index * 2 + 1].toInt()
      samples[index] = (((high shl 8) or low) / 32768f)
    }
    session?.acceptBlocking(AudioChunk(samples, SAMPLE_RATE_HZ))
  }

  fun finish(): TranscriptionResult {
    val activeSession = checkNotNull(session) { "streaming transcription is not active" }
    return try {
      activeSession.finishBlocking()
    } finally {
      session = null
    }
  }

  fun cancel() {
    session?.cancelBlocking()
    session = null
  }

  fun close() {
    cancel()
    transcriber.close()
  }

  companion object {
    private const val SAMPLE_RATE_HZ = 16_000
  }
}
