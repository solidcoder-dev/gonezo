package com.gonezo.multiplatform.plugins.speech.quality

import java.text.Normalizer

class DefaultTranscriptTextValidator : TranscriptTextValidator {
  override fun validate(text: String): TranscriptTextValidation {
    if (text.isBlank()) {
      return TranscriptTextValidation.Invalid("transcript is empty")
    }

    if (text.any { it == '\uFFFD' }) {
      return TranscriptTextValidation.Invalid("transcript contains replacement characters")
    }

    if (text.any { it != ' ' && it.isWhitespace() }) {
      return TranscriptTextValidation.Invalid("transcript contains unsupported whitespace")
    }

    if (text.any { Character.isISOControl(it) && it != ' ' }) {
      return TranscriptTextValidation.Invalid("transcript contains control characters")
    }

    val normalized = Normalizer.normalize(text, Normalizer.Form.NFC)
      .replace(Regex(" +"), " ")
      .trim()

    if (normalized.isBlank()) {
      return TranscriptTextValidation.Invalid("transcript is empty after normalization")
    }

    if (hasRepeatedCharacter(normalized, 5)) {
      return TranscriptTextValidation.Invalid("transcript contains repeated characters")
    }

    val nonSpaceCharacters = normalized.filterNot { it == ' ' }
    if (nonSpaceCharacters.isEmpty()) {
      return TranscriptTextValidation.Invalid("transcript contains no letters or digits")
    }

    val letterOrDigitCount = nonSpaceCharacters.count { it.isLetterOrDigit() }
    if (letterOrDigitCount == 0) {
      return TranscriptTextValidation.Invalid("transcript contains no letters or digits")
    }

    val ratio = letterOrDigitCount.toDouble() / nonSpaceCharacters.length.toDouble()
    if (ratio < 0.50) {
      return TranscriptTextValidation.Invalid("transcript is dominated by symbols")
    }

    return TranscriptTextValidation.Valid(normalized)
  }

  private fun hasRepeatedCharacter(text: String, maximumRepeatedCharacterCount: Int): Boolean {
    var previous: Char? = null
    var runLength = 0
    for (character in text) {
      if (character == ' ') {
        previous = null
        runLength = 0
        continue
      }
      if (character == previous) {
        runLength += 1
      } else {
        previous = character
        runLength = 1
      }
      if (runLength > maximumRepeatedCharacterCount) {
        return true
      }
    }
    return false
  }
}
