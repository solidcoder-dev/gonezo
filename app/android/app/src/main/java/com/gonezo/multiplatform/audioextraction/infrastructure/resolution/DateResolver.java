package com.gonezo.multiplatform.audioextraction.infrastructure.resolution;

import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.schema.FieldSchema;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.List;

final class DateResolver implements FieldResolver {
  @Override
  public boolean supports(FieldSchema schema) {
    return "string".equals(schema.type()) && "date-time".equals(schema.format());
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
      return new ResolvedField(null, 0D, candidate.evidence(), List.of("invalid_format"));
    }

    String normalized = parseDateTime(raw);
    if (normalized == null) {
      return new ResolvedField(null, 0D, candidate.evidence(), List.of("invalid_format"));
    }

    return new ResolvedField(normalized, ResolverSupport.clamp(candidate.confidence()), candidate.evidence(), List.of());
  }

  private String parseDateTime(String value) {
    try {
      return Instant.parse(value).toString();
    } catch (DateTimeParseException ignored) {
      // try as local date
    }

    try {
      return LocalDate.parse(value).atStartOfDay().toInstant(ZoneOffset.UTC).toString();
    } catch (DateTimeParseException ignored) {
      return null;
    }
  }
}
