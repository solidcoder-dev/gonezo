package com.gonezo.multiplatform.audioextraction.infrastructure.resolution;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.gonezo.multiplatform.audioextraction.domain.model.Evidence;
import com.gonezo.multiplatform.audioextraction.domain.model.ExtractionContext;
import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.schema.FieldSchema;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.Test;

public class ResolutionCoordinatorImplTest {

  @Test
  public void resolvesBestCandidatesPerFieldType() {
    ResolutionCoordinatorImpl coordinator = new ResolutionCoordinatorImpl();
    OutputSchema schema = new OutputSchema(new LinkedHashMap<>(Map.of(
      "type", new FieldSchema("string", null, List.of("expense", "income"), true),
      "amount", new FieldSchema("number", null, List.of(), true),
      "occurredAt", new FieldSchema("string", "date-time", List.of(), true)
    )));

    Map<String, List<FieldCandidate>> candidates = new LinkedHashMap<>();
    candidates.put("type", List.of(
      new FieldCandidate("type", "expense", 0.30D, List.of()),
      new FieldCandidate("type", "Income", 0.92D, List.of(new Evidence("income", 0L, 0L)))
    ));
    candidates.put("amount", List.of(
      new FieldCandidate("amount", "10,50", 0.65D, List.of()),
      new FieldCandidate("amount", "12.75", 0.88D, List.of())
    ));
    candidates.put("occurredAt", List.of(
      new FieldCandidate("occurredAt", "2026-04-01", 0.80D, List.of())
    ));

    Map<String, ResolvedField> resolved = coordinator.resolve(
      candidates,
      schema,
      new ExtractionContext("req-1", Map.of())
    );

    assertEquals("income", resolved.get("type").value());
    assertEquals(12.75D, (Double) resolved.get("amount").value(), 0.000001D);
    assertEquals("2026-04-01T00:00:00Z", resolved.get("occurredAt").value());
    assertTrue(resolved.get("type").issues().isEmpty());
    assertTrue(resolved.get("amount").issues().isEmpty());
    assertTrue(resolved.get("occurredAt").issues().isEmpty());
  }

  @Test
  public void reportsMissingAndInvalidFormatIssues() {
    ResolutionCoordinatorImpl coordinator = new ResolutionCoordinatorImpl();
    OutputSchema schema = new OutputSchema(new LinkedHashMap<>(Map.of(
      "amount", new FieldSchema("number", null, List.of(), true),
      "note", new FieldSchema("string", null, List.of(), true),
      "occurredAt", new FieldSchema("string", "date-time", List.of(), true)
    )));

    Map<String, List<FieldCandidate>> candidates = new LinkedHashMap<>();
    candidates.put("amount", List.of(new FieldCandidate("amount", "abc", 0.9D, List.of())));
    candidates.put("occurredAt", List.of(new FieldCandidate("occurredAt", "yesterday maybe", 0.9D, List.of())));

    Map<String, ResolvedField> resolved = coordinator.resolve(
      candidates,
      schema,
      new ExtractionContext("req-2", Map.of())
    );

    assertNull(resolved.get("amount").value());
    assertEquals(List.of("invalid_format"), resolved.get("amount").issues());
    assertNull(resolved.get("note").value());
    assertEquals(List.of("missing"), resolved.get("note").issues());
    assertNull(resolved.get("occurredAt").value());
    assertEquals(List.of("invalid_format"), resolved.get("occurredAt").issues());
  }
}

