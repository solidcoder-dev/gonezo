package com.gonezo.multiplatform.audioextraction.infrastructure.resolution;

import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.schema.FieldSchema;
import java.util.List;

final class EnumResolver implements FieldResolver {
  @Override
  public boolean supports(FieldSchema schema) {
    return schema.enumValues() != null && !schema.enumValues().isEmpty();
  }

  @Override
  public ResolvedField resolve(String fieldName, FieldSchema schema, List<FieldCandidate> candidates) {
    FieldCandidate candidate = ResolverSupport.bestCandidate(candidates);
    if (candidate == null || candidate.rawValue() == null) {
      List<String> issues = schema.required() ? List.of("missing") : List.of();
      return new ResolvedField(null, 0D, List.of(), issues);
    }

    String raw = String.valueOf(candidate.rawValue()).trim();
    if (raw.isEmpty()) {
      List<String> issues = schema.required() ? List.of("missing") : List.of("invalid");
      return new ResolvedField(null, 0D, candidate.evidence(), issues);
    }

    for (String enumValue : schema.enumValues()) {
      if (enumValue.equalsIgnoreCase(raw)) {
        return new ResolvedField(enumValue, ResolverSupport.clamp(candidate.confidence()), candidate.evidence(), List.of());
      }
    }

    return new ResolvedField(null, 0D, candidate.evidence(), List.of("invalid"));
  }
}
