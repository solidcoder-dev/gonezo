package com.gonezo.multiplatform.infrastructure.transcription.audio

interface TranscriptTextValidator {
  fun validate(text: String): TranscriptTextValidation
}
