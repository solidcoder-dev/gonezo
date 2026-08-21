package com.gonezo.multiplatform.infrastructure.transcription.audio

data class TranscriptQualitySettings(
  val maximumNoSpeechProbability: Float = 0.60f,
)
