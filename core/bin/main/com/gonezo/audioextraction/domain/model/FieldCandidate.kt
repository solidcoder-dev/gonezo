package com.gonezo.audioextraction.domain.model

data class FieldCandidate(
  val fieldName: String,
  val rawValue: Any?,
  val confidence: Double,
  val evidence: List<Evidence> = emptyList(),
)
