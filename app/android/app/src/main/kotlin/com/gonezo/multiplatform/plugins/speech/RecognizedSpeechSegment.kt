package com.gonezo.multiplatform.plugins.speech

data class RecognizedSpeechSegment(
  val text: String,
  val startMs: Long,
  val endMs: Long,
  val noSpeechProbability: Float,
)
