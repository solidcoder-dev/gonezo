package dev.solidcoder.speech

data class Transcript(
  val text: String,
  val segments: List<TranscriptSegment> = emptyList(),
) {
  init {
    require(text.trim().isNotEmpty()) { "transcript text is required" }
    require(segments.all { it.text.trim().isNotEmpty() }) { "transcript segment text is required" }
  }
}

data class TranscriptSegment(
  val text: String,
  val startMs: Long = 0,
  val endMs: Long = 0,
  val noSpeechProbability: Float = 0f,
) {
  init {
    require(text.trim().isNotEmpty()) { "transcript segment text is required" }
    require(startMs >= 0L) { "transcript segment start cannot be negative" }
    require(endMs >= startMs) { "transcript segment end cannot precede its start" }
    require(noSpeechProbability in 0f..1f) { "transcript segment silence probability must be within range" }
  }
}
