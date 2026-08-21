package com.gonezo.multiplatform.infrastructure.transcription.audio

import com.gonezo.multiplatform.infrastructure.transcription.whisper.RecognizedSpeechSegment

interface TranscriptQualityPolicy {
  fun evaluate(segments: List<RecognizedSpeechSegment>): TranscriptQualityResult
}
