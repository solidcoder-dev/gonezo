package com.gonezo.multiplatform.plugins.speech.quality

import com.gonezo.multiplatform.plugins.speech.RecognizedSpeechSegment

sealed interface TranscriptQualityResult {
  data class Ready(
    val text: String,
    val segments: List<RecognizedSpeechSegment>,
  ) : TranscriptQualityResult

  data object NoSpeechDetected : TranscriptQualityResult
}
