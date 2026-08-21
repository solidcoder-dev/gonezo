package com.gonezo.multiplatform.infrastructure.transcription.whisper

internal class WhisperTranscriptMerger {
  private val words = mutableListOf<String>()

  fun add(text: String) {
    val incoming = text.trim().split(WORD_SEPARATOR).filter(String::isNotBlank)
    if (incoming.isEmpty()) return
    val overlap = (minOf(words.size, incoming.size) downTo 1).firstOrNull { count ->
      words.takeLast(count).map(::normalizedWord) == incoming.take(count).map(::normalizedWord)
    } ?: 0
    words += incoming.drop(overlap)
  }

  fun text(): String = words.joinToString(" ")

  private fun normalizedWord(word: String): String = word
    .lowercase()
    .trim { it == '"' || it == '\'' || it == ',' || it == '.' || it == '!' || it == '?' }

  companion object {
    private val WORD_SEPARATOR = Regex("\\s+")
  }
}
