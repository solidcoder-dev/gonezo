package dev.solidcoder.speech

data class TranscriptionResult(
  val transcript: Transcript?,
  val issues: List<TranscriptionIssue> = emptyList(),
) {
  init {
    require(transcript != null || issues.isNotEmpty()) { "transcription result must contain a transcript or an issue" }
    require(transcript == null || issues.none { it.severity == TranscriptionIssueSeverity.DEFINITIVE }) {
      "a successful transcription cannot contain a definitive issue"
    }
  }

  val isSuccess: Boolean
    get() = transcript != null

  companion object {
    fun success(transcript: Transcript): TranscriptionResult = TranscriptionResult(transcript)

    fun failure(issue: TranscriptionIssue): TranscriptionResult = TranscriptionResult(null, listOf(issue))
  }
}
