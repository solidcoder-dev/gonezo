package com.gonezo.multiplatform.audioextraction.infrastructure.resolution;

import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import java.util.Comparator;
import java.util.List;

final class ResolverSupport {
  private ResolverSupport() {
  }

  static FieldCandidate bestCandidate(List<FieldCandidate> candidates) {
    if (candidates == null || candidates.isEmpty()) {
      return null;
    }
    return candidates.stream().max(Comparator.comparingDouble(FieldCandidate::confidence)).orElse(null);
  }

  static double clamp(double confidence) {
    if (confidence < 0D) {
      return 0D;
    }
    if (confidence > 1D) {
      return 1D;
    }
    return confidence;
  }
}
