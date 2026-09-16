package com.gonezo.multiplatform.infrastructure.transcription.runtime

import dev.solidcoder.speech.AudioSourceRef
import dev.solidcoder.speech.Transcript
import dev.solidcoder.speech.TranscriptionIssue
import dev.solidcoder.speech.TranscriptionIssueSeverity
import dev.solidcoder.speech.TranscriptionRequest
import dev.solidcoder.speech.TranscriptionResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FallbackAndroidSpeechTranscriberTest {
  private val request = TranscriptionRequest(AudioSourceRef.of("audio"))

  @Test
  fun returnsPreferredSuccessWithoutCallingWhisper() {
    val preferred = FakeTranscriber(TranscriptionResult.success(Transcript("preferred")))
    val fallback = FakeTranscriber(TranscriptionResult.success(Transcript("whisper")))

    val result = FallbackAndroidSpeechTranscriber(preferred, fallback).transcribeBlocking(request)

    assertEquals("preferred", result.transcript?.text)
    assertEquals(1, preferred.transcribeCalls)
    assertEquals(0, fallback.transcribeCalls)
  }

  @Test
  fun usesWhisperWhenPreferredIsUnavailable() {
    val preferred = FakeTranscriber(failure("transcription-unavailable", true))
    val fallback = FakeTranscriber(TranscriptionResult.success(Transcript("whisper")))

    val result = FallbackAndroidSpeechTranscriber(preferred, fallback).transcribeBlocking(request)

    assertEquals("whisper", result.transcript?.text)
    assertEquals(1, fallback.transcribeCalls)
  }

  @Test
  fun usesWhisperWhenPreferredHasRecoverableRuntimeFailure() {
    val preferred = FakeTranscriber(failure("native-transcription-failed", true))
    val fallback = FakeTranscriber(TranscriptionResult.success(Transcript("whisper")))

    val result = FallbackAndroidSpeechTranscriber(preferred, fallback).transcribeBlocking(request)

    assertEquals("whisper", result.transcript?.text)
  }

  @Test
  fun propagatesCancellationWithoutStartingWhisper() {
    val preferred = FakeTranscriber(failure("transcription-cancelled", true))
    val fallback = FakeTranscriber(TranscriptionResult.success(Transcript("whisper")))

    val result = FallbackAndroidSpeechTranscriber(preferred, fallback).transcribeBlocking(request)

    assertEquals("transcription-cancelled", result.issues.single().code)
    assertEquals(0, fallback.transcribeCalls)
  }

  @Test
  fun doesNotFallbackDefinitiveInputFailure() {
    val preferred = FakeTranscriber(failure("invalid-audio", false))
    val fallback = FakeTranscriber(TranscriptionResult.success(Transcript("whisper")))

    val result = FallbackAndroidSpeechTranscriber(preferred, fallback).transcribeBlocking(request)

    assertEquals("invalid-audio", result.issues.single().code)
    assertEquals(0, fallback.transcribeCalls)
  }

  private fun failure(code: String, recoverable: Boolean): TranscriptionResult = TranscriptionResult.failure(
    TranscriptionIssue(code, code, if (recoverable) TranscriptionIssueSeverity.RECOVERABLE else TranscriptionIssueSeverity.DEFINITIVE, recoverable, recoverable),
  )

  private class FakeTranscriber(
    private val response: TranscriptionResult,
  ) : AndroidSpeechTranscriber {
    var transcribeCalls = 0
    var cancelled = false
    var closed = false

    override fun transcribeBlocking(request: TranscriptionRequest): TranscriptionResult {
      transcribeCalls++
      return response
    }

    override suspend fun transcribe(request: TranscriptionRequest): TranscriptionResult = transcribeBlocking(request)

    override fun cancelBlocking() {
      cancelled = true
    }

    override fun close() {
      closed = true
    }
  }
}
