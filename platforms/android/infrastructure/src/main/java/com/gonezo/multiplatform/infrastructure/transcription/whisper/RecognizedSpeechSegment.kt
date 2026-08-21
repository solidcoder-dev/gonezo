package com.gonezo.multiplatform.infrastructure.transcription.whisper

data class RecognizedSpeechSegment(
  val text: String,
  val startMs: Long,
  val endMs: Long,
  val noSpeechProbability: Float,
)
