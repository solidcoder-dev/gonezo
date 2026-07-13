package dev.solidcoder.interpretation.domain

data class FieldCandidate(
  val value: StructuredValue,
  val confidence: Confidence,
  val rationale: String? = null,
) {
  init {
    require(rationale == null || rationale.isNotBlank()) { "candidate rationale cannot be blank" }
  }
}
