package com.gonezo.audioextraction.infrastructure.llm

data class LlmConfig(
  val maxTokens: Int,
  val maxInputChars: Int,
  val timeoutMs: Long,
)
