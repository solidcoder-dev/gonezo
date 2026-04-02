package com.gonezo.audioextraction.infrastructure.llm

import com.gonezo.audioextraction.domain.error.AudioExtractionException
import com.gonezo.audioextraction.domain.error.ErrorCode
import com.gonezo.audioextraction.domain.model.Transcript

class DefaultLlmGuard : LlmGuard {
  override fun validate(transcript: Transcript, config: LlmConfig) {
    val text = transcript.text
    if (text.isBlank()) {
      throw AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Transcript is empty")
    }
    if (text.length > config.maxInputChars) {
      throw AudioExtractionException(ErrorCode.POLICY_REJECTED, "Transcript exceeds maxInputChars")
    }
  }
}
