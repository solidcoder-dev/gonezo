package dev.solidcoder.interpretation.domain

enum class InterpretationIssueLevel {
  WARNING,
  ERROR,
}

data class InterpretationIssue(
  val code: String,
  val message: String,
  val level: InterpretationIssueLevel = InterpretationIssueLevel.WARNING,
  val fieldKey: FieldKey? = null,
) {
  init {
    require(code.isNotBlank()) { "interpretation issue code is required" }
    require(message.isNotBlank()) { "interpretation issue message is required" }
  }
}
