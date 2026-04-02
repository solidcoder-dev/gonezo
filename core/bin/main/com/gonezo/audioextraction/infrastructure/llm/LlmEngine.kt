package com.gonezo.audioextraction.infrastructure.llm

interface LlmEngine {
  fun infer(prompt: String): String
}
