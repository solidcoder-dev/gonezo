package com.gonezo.audioextraction.infrastructure.llm

interface ExtractionTelemetry {
  fun llmCall(requestId: String, durationMs: Long, inputSize: Int, success: Boolean)
}
