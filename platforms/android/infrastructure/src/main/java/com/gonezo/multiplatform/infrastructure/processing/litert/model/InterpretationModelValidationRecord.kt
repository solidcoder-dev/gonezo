package com.gonezo.multiplatform.infrastructure.processing.litert.model

import java.io.File

internal data class InterpretationModelValidationRecord(
  val schemaVersion: Int,
  val modelId: String,
  val modelVersion: String,
  val fileName: String,
  val expectedSizeBytes: Long,
  val expectedSha256: String,
  val observedSizeBytes: Long,
  val observedLastModified: Long,
) {
  fun matches(configuration: InterpretationModelConfiguration, file: File): Boolean =
    schemaVersion == CURRENT_SCHEMA_VERSION &&
      modelId == configuration.modelId &&
      modelVersion == configuration.modelVersion &&
      fileName == configuration.fileName &&
      expectedSizeBytes == configuration.expectedSizeBytes &&
      expectedSha256 == configuration.sha256 &&
      observedSizeBytes == file.length() &&
      observedLastModified == file.lastModified() &&
      file.isFile

  companion object {
    const val CURRENT_SCHEMA_VERSION = 1
  }
}
