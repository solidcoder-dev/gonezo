package com.gonezo.audioextraction.domain.model

data class ExtractionContext(
  val requestId: String,
  val context: Map<String, Any?> = emptyMap(),
)
