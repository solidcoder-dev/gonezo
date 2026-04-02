package com.gonezo.audioextraction.ui.dto

data class ExtractionRequestDto(
  val schemaVersion: String,
  val source: SourceDto,
  val extraction: ExtractionDto,
  val context: Map<String, Any?> = emptyMap(),
  val options: OptionsDto? = null,
) {
  data class SourceDto(
    val type: String,
    val value: String,
  )

  data class ExtractionDto(
    val outputSchema: Map<String, Any?>,
    val instructions: String? = null,
  )

  data class OptionsDto(
    val includeTranscript: Boolean? = null,
    val language: String? = null,
  )
}
