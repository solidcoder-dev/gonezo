package com.gonezo.multiplatform.plugins.interpretation.model

internal data class InterpretationModelConfiguration(
  val modelId: String,
  val modelVersion: String,
  val assetPath: String,
  val fileName: String,
  val expectedSizeBytes: Long,
  val sha256: String,
)
