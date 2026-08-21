package com.gonezo.multiplatform.infrastructure.transcription.audio

sealed interface TranscriptTextValidation {
  data class Valid(
    val normalizedText: String,
  ) : TranscriptTextValidation

  data class Invalid(
    val reason: String,
  ) : TranscriptTextValidation
}
