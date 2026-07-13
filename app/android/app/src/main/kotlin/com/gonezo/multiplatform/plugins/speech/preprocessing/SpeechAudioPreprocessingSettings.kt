package com.gonezo.multiplatform.plugins.speech.preprocessing

data class SpeechAudioPreprocessingSettings(
  val windowDurationMs: Int = 25,
  val minimumAbsoluteRms: Float = 0.006f,
  val noiseFloorMultiplier: Float = 3.0f,
  val minimumSpeechDurationMs: Long = 250,
  val paddingDurationMs: Long = 200,
)
