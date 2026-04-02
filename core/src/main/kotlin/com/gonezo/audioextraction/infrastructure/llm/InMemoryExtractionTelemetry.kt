package com.gonezo.audioextraction.infrastructure.llm

class InMemoryExtractionTelemetry : ExtractionTelemetry {
  private val entries = mutableListOf<String>()

  override fun llmCall(requestId: String, durationMs: Long, inputSize: Int, success: Boolean) {
    entries.add("$requestId:$durationMs:$inputSize:$success")
  }

  fun entries(): List<String> = entries.toList()
}
