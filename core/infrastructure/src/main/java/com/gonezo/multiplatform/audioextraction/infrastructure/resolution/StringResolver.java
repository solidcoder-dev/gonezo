package com.gonezo.multiplatform.audioextraction.infrastructure.resolution;

import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.schema.FieldSchema;
import java.util.List;

final class StringResolver implements FieldResolver {
  @Override
  public boolean supports(FieldSchema schema) {
    return "string".equals(schema.type()) && schema.enumValues().isEmpty() && (schema.format() == null || schema.format().isBlank());
  }

  @Override
  public ResolvedField resolve(String fieldName, FieldSchema schema, List<FieldCandidate> candidates) {
    FieldCandidate candidate = ResolverSupport.bestCandidate(candidates);
    if (candidate == null || candidate.rawValue() == null) {
      List<String> issues = schema.required() ? List.of("missing") : List.of();
      return new ResolvedField(null, 0D, List.of(), issues);
    }

    String value = candidate.rawValue() instanceof String strValue
      ? strValue.trim()
      : String.valueOf(candidate.rawValue()).trim();

    if (value.isEmpty()) {
      List<String> issues = schema.required() ? List.of("missing") : List.of("invalid");
      return new ResolvedField(null, 0D, candidate.evidence(), issues);
    }

    return new ResolvedField(value, ResolverSupport.clamp(candidate.confidence()), candidate.evidence(), List.of());
  }
}
