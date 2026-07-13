package com.gonezo.multiplatform.plugins.speech.quality

interface TranscriptTextValidator {
  fun validate(text: String): TranscriptTextValidation
}
