package dev.solidcoder.speech

enum class TranscriptionIssueSeverity {
  RECOVERABLE,
  DEFINITIVE,
}

data class TranscriptionIssue(
  val code: String,
  val message: String,
  val severity: TranscriptionIssueSeverity,
  val recoverable: Boolean = severity == TranscriptionIssueSeverity.RECOVERABLE,
  val retryable: Boolean = recoverable,
) {
  init {
    require(code.isNotBlank()) { "transcription issue code is required" }
    require(message.isNotBlank()) { "transcription issue message is required" }
  }
}
