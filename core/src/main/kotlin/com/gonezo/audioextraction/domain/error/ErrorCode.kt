package com.gonezo.audioextraction.domain.error

enum class ErrorCode {
  INVALID_REQUEST,
  POLICY_REJECTED,
  TRANSCRIPTION_FAILED,
  LLM_FAILED,
  PARSING_FAILED,
  RESOLUTION_FAILED,
}
