package com.gonezo.multiplatform.infrastructure.transcription.model

internal data class SpeechModelConfiguration(
  val assetPath: String,
  val expectedSize: Long,
  val expectedSha256: String,
)
