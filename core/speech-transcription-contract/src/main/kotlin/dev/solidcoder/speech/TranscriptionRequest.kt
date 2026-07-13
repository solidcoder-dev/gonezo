package dev.solidcoder.speech

data class TranscriptionRequest(
  val audioSource: AudioSourceRef,
  val language: String? = null,
  val detectLanguageAutomatically: Boolean = language == null,
) {
  init {
    require(language == null || language.trim().isNotEmpty()) { "language cannot be blank" }
    require(language == null || !detectLanguageAutomatically) { "automatic language detection cannot be combined with an explicit language" }
  }
}
