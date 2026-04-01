package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import java.util.ArrayList;
import java.util.List;

public final class InMemoryExtractionTelemetry implements ExtractionTelemetry {
  private final List<String> entries = new ArrayList<>();

  @Override
  public void llmCall(String requestId, long durationMs, int inputSize, boolean success) {
    entries.add(requestId + ":" + durationMs + ":" + inputSize + ":" + success);
  }

  public List<String> entries() {
    return List.copyOf(entries);
  }
}
