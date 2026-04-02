package com.gonezo.audioextraction.ui.dto

data class ExtractionResultDto(
  val schemaVersion: String?,
  val outcome: String?,
  val data: Map<String, Any?>,
  val fieldResults: Map<String, FieldResultDto>,
  val globalIssues: List<String>,
  val processingInfo: ProcessingInfoDto?,
  val transcript: String?,
) {
  data class FieldResultDto(
    val value: Any?,
    val confidence: Double,
    val evidence: List<EvidenceDto>,
    val issues: List<String>,
  )

  data class EvidenceDto(
    val text: String,
    val startMs: Long,
    val endMs: Long,
  )

  data class ProcessingInfoDto(
    val requestId: String?,
    val version: String?,
    val processingTimeMs: Double,
    val stageTimings: Map<String, Double>,
  )
}
