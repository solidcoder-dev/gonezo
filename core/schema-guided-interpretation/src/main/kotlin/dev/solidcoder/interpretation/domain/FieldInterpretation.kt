package dev.solidcoder.interpretation.domain

sealed interface FieldInterpretation {
  data class Resolved(val candidate: FieldCandidate) : FieldInterpretation

  data class Ambiguous(val candidates: List<FieldCandidate>) : FieldInterpretation {
    init {
      require(candidates.size >= 2) { "ambiguous interpretation requires at least two candidates" }
    }
  }

  data object Missing : FieldInterpretation
}
