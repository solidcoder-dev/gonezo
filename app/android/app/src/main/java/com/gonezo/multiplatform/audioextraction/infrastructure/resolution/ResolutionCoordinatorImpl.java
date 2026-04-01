package com.gonezo.multiplatform.audioextraction.infrastructure.resolution;

import com.gonezo.multiplatform.audioextraction.application.ResolutionCoordinator;
import com.gonezo.multiplatform.audioextraction.domain.model.ExtractionContext;
import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.schema.FieldSchema;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ResolutionCoordinatorImpl implements ResolutionCoordinator {
  private final List<FieldResolver> resolvers = List.of(
    new EnumResolver(),
    new DateResolver(),
    new NumberResolver(),
    new StringResolver()
  );

  @Override
  public Map<String, ResolvedField> resolve(
    Map<String, List<FieldCandidate>> candidates,
    OutputSchema schema,
    ExtractionContext context
  ) {
    Map<String, ResolvedField> resolved = new LinkedHashMap<>();

    for (Map.Entry<String, FieldSchema> fieldEntry : schema.fields().entrySet()) {
      String fieldName = fieldEntry.getKey();
      FieldSchema fieldSchema = fieldEntry.getValue();
      List<FieldCandidate> fieldCandidates = candidates.getOrDefault(fieldName, List.of());

      ResolvedField field = resolveField(fieldName, fieldSchema, fieldCandidates);
      resolved.put(fieldName, normalizeIssues(field));
    }

    return resolved;
  }

  private ResolvedField resolveField(String fieldName, FieldSchema schema, List<FieldCandidate> candidates) {
    for (FieldResolver resolver : resolvers) {
      if (resolver.supports(schema)) {
        return resolver.resolve(fieldName, schema, candidates);
      }
    }

    if (schema.required()) {
      return new ResolvedField(null, 0D, List.of(), List.of("missing"));
    }

    return new ResolvedField(null, 0D, List.of(), List.of());
  }

  private ResolvedField normalizeIssues(ResolvedField field) {
    if (field.issues().isEmpty()) {
      return field;
    }

    List<String> normalizedIssues = new ArrayList<>();
    for (String issue : field.issues()) {
      String value = issue == null ? "" : issue.trim();
      if ("missing".equals(value) || "ambiguous".equals(value) || "invalid".equals(value) || "invalid_format".equals(value)) {
        normalizedIssues.add(value);
      } else {
        normalizedIssues.add("invalid");
      }
    }

    return new ResolvedField(field.value(), field.confidence(), field.evidence(), normalizedIssues);
  }
}
