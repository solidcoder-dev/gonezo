package com.gonezo.multiplatform.infrastructure.transcription.runtime

import dev.solidcoder.speech.TranscriptionRequest
import dev.solidcoder.speech.TranscriptionResult
import kotlinx.coroutines.CancellationException

internal class FallbackAndroidSpeechTranscriber(
  private val preferred: AndroidSpeechTranscriber,
  private val fallback: AndroidSpeechTranscriber,
) : AndroidSpeechTranscriber {
  override fun transcribeBlocking(request: TranscriptionRequest): TranscriptionResult {
    val preferredResult = try {
      preferred.transcribeBlocking(request)
    } catch (exception: CancellationException) {
      throw exception
    } catch (_: RuntimeException) {
      null
    }
    if (preferredResult?.isSuccess == true) return preferredResult
    if (preferredResult?.issues?.any { it.code == "transcription-cancelled" } == true) return preferredResult
    if (preferredResult?.issues?.any { !it.recoverable } == true) return preferredResult
    return fallback.transcribeBlocking(request)
  }

  override suspend fun transcribe(request: TranscriptionRequest): TranscriptionResult = transcribeBlocking(request)

  override fun cancelBlocking() {
    preferred.cancelBlocking()
    fallback.cancelBlocking()
  }

  override fun close() {
    preferred.close()
    fallback.close()
  }
}
