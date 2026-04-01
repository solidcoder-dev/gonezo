package com.gonezo.multiplatform.audioextraction.domain.model;

import java.util.List;

public record FieldCandidate(String fieldName, Object rawValue, double confidence, List<Evidence> evidence) {
  public FieldCandidate {
    if (evidence == null) {
      evidence = List.of();
    }
  }
}
