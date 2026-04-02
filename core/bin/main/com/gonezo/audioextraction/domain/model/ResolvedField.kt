package com.gonezo.audioextraction.domain.model

data class ResolvedField(
  val value: Any?,
  val confidence: Double,
  val evidence: List<Evidence> = emptyList(),
  val issues: List<String> = emptyList(),
)
