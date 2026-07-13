package com.gonezo.multiplatform.plugins.speech.quality

sealed interface TranscriptTextValidation {
  data class Valid(
    val normalizedText: String,
  ) : TranscriptTextValidation

  data class Invalid(
    val reason: String,
  ) : TranscriptTextValidation
}
