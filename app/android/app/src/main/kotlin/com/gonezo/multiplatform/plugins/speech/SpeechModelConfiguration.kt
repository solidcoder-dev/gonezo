package com.gonezo.multiplatform.plugins.speech

internal data class SpeechModelConfiguration(
  val assetPath: String,
  val expectedSize: Long,
  val expectedSha256: String,
)
