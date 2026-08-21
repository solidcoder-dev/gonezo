package com.gonezo.multiplatform.infrastructure.transcription.audio

import com.gonezo.multiplatform.infrastructure.transcription.whisper.RecognizedSpeechSegment

sealed interface TranscriptQualityResult {
  data class Ready(
    val text: String,
    val segments: List<RecognizedSpeechSegment>,
  ) : TranscriptQualityResult

  data object NoSpeechDetected : TranscriptQualityResult
}
