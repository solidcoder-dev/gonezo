package com.gonezo.audioextraction.infrastructure.llm

import com.gonezo.audioextraction.domain.model.Transcript

interface LlmGuard {
  fun validate(transcript: Transcript, config: LlmConfig)
}
