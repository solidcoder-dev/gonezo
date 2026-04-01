package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

public interface ExtractionTelemetry {
  void llmCall(String requestId, long durationMs, int inputSize, boolean success);
}
