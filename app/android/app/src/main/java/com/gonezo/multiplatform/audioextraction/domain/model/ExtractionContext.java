package com.gonezo.multiplatform.audioextraction.domain.model;

import java.util.Map;

public record ExtractionContext(String requestId, Map<String, Object> context) {
  public ExtractionContext {
    if (context == null) {
      context = Map.of();
    }
  }
}
