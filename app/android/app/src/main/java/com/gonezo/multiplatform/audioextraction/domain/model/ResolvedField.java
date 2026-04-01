package com.gonezo.multiplatform.audioextraction.domain.model;

import java.util.List;

public record ResolvedField(Object value, double confidence, List<Evidence> evidence, List<String> issues) {
  public ResolvedField {
    if (evidence == null) {
      evidence = List.of();
    }
    if (issues == null) {
      issues = List.of();
    }
  }
}
