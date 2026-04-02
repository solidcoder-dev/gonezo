package com.gonezo.audioextraction.domain.model

data class ExecutionPlan(
  val requiredFields: List<String> = emptyList(),
  val optionalFields: List<String> = emptyList(),
  val includeTranscript: Boolean,
)
