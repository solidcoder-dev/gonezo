package com.gonezo.multiplatform.plugins.interpretation.artifacts

internal data class InterpretationRuntimeMetadata(
  val modelId: String,
  val modelVersion: String,
  val backend: String,
)

internal data class InterpretationFailureArtifact(
  val code: String,
  val failureCode: String? = null,
  val recoverable: Boolean,
  val exceptionType: String,
  val phase: String,
  val safeMessage: String,
  val runtime: InterpretationRuntimeMetadata,
  val fieldKey: String? = null,
  val fieldIndex: Int? = null,
  val fieldCount: Int? = null,
  val durationMs: Long? = null,
  val outputLength: Int? = null,
  val completedFieldKeys: List<String> = emptyList(),
  val failedFieldKey: String? = null,
)
