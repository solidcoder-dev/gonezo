package com.gonezo.multiplatform.audioextraction.infrastructure.resolution;

import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.schema.FieldSchema;
import java.math.BigDecimal;
import java.util.List;

final class NumberResolver implements FieldResolver {
  @Override
  public boolean supports(FieldSchema schema) {
    return "number".equals(schema.type()) || "integer".equals(schema.type());
  }

  @Override
  public ResolvedField resolve(String fieldName, FieldSchema schema, List<FieldCandidate> candidates) {
    FieldCandidate candidate = ResolverSupport.bestCandidate(candidates);
    if (candidate == null || candidate.rawValue() == null) {
      List<String> issues = schema.required() ? List.of("missing") : List.of();
      return new ResolvedField(null, 0D, List.of(), issues);
    }

    BigDecimal parsedNumber = parse(candidate.rawValue());
    if (parsedNumber == null) {
      return new ResolvedField(null, 0D, candidate.evidence(), List.of("invalid_format"));
    }

    if ("integer".equals(schema.type())) {
      return new ResolvedField(parsedNumber.longValue(), ResolverSupport.clamp(candidate.confidence()), candidate.evidence(), List.of());
    }

    return new ResolvedField(parsedNumber.doubleValue(), ResolverSupport.clamp(candidate.confidence()), candidate.evidence(), List.of());
  }

  private BigDecimal parse(Object rawValue) {
    if (rawValue instanceof Number numberValue) {
      return new BigDecimal(numberValue.toString());
    }

    if (!(rawValue instanceof String stringValue)) {
      return null;
    }

    String normalized = stringValue.trim();
    if (normalized.isEmpty()) {
      return null;
    }

    normalized = normalized.replace(" ", "").replace(",", ".");
    try {
      return new BigDecimal(normalized);
    } catch (NumberFormatException ex) {
      return null;
    }
  }
}
