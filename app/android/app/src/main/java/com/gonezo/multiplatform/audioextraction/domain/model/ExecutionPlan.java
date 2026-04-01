package com.gonezo.multiplatform.audioextraction.domain.model;

import java.util.List;

public record ExecutionPlan(List<String> requiredFields, List<String> optionalFields, boolean includeTranscript) {
  public ExecutionPlan {
    if (requiredFields == null) {
      requiredFields = List.of();
    }
    if (optionalFields == null) {
      optionalFields = List.of();
    }
  }
}
