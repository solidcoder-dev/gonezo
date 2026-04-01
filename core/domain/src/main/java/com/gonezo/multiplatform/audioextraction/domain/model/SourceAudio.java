package com.gonezo.multiplatform.audioextraction.domain.model;

import java.util.Map;

public record SourceAudio(byte[] bytes, String mimeType, String sourceRef, Map<String, Object> metadata) {
  public SourceAudio {
    if (metadata == null) {
      metadata = Map.of();
    }
  }
}
