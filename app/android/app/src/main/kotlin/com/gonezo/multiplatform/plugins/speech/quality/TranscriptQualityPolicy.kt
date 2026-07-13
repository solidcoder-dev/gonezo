package com.gonezo.multiplatform.plugins.speech.quality

import com.gonezo.multiplatform.plugins.speech.RecognizedSpeechSegment

interface TranscriptQualityPolicy {
  fun evaluate(segments: List<RecognizedSpeechSegment>): TranscriptQualityResult
}
