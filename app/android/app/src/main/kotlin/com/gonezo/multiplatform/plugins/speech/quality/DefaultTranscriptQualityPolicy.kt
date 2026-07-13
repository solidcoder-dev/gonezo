package com.gonezo.multiplatform.plugins.speech.quality

import com.gonezo.multiplatform.plugins.speech.RecognizedSpeechSegment

class DefaultTranscriptQualityPolicy(
  private val settings: TranscriptQualitySettings = TranscriptQualitySettings(),
) : TranscriptQualityPolicy {
  override fun evaluate(segments: List<RecognizedSpeechSegment>): TranscriptQualityResult {
    val filtered = segments.filter { segment ->
      segment.text.isNotBlank() && segment.noSpeechProbability <= settings.maximumNoSpeechProbability
    }
    if (filtered.isEmpty()) {
      return TranscriptQualityResult.NoSpeechDetected
    }

    val text = filtered.joinToString(separator = " ") { it.text.trim() }.trim()
    if (text.isBlank()) {
      return TranscriptQualityResult.NoSpeechDetected
    }

    return TranscriptQualityResult.Ready(text = text, segments = filtered)
  }
}
