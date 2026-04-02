package com.gonezo.audioextraction.domain.model

data class SourceAudio(
  val bytes: ByteArray,
  val mimeType: String,
  val sourceRef: String,
  val metadata: Map<String, Any?> = emptyMap(),
)
