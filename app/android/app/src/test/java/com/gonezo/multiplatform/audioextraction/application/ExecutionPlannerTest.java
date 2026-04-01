package com.gonezo.multiplatform.audioextraction.application;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.gonezo.multiplatform.audioextraction.contract.ExtractionRequest;
import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.schema.FieldSchema;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.Test;

public class ExecutionPlannerTest {

  @Test
  public void buildsPlanUsingRequiredAndOptionalFields() {
    ExecutionPlanner planner = new ExecutionPlanner();
    Map<String, FieldSchema> orderedFields = new LinkedHashMap<>();
    orderedFields.put("amount", new FieldSchema("number", null, List.of(), true));
    orderedFields.put("note", new FieldSchema("string", null, List.of(), false));
    orderedFields.put("type", new FieldSchema("string", null, List.of("expense", "income"), true));
    OutputSchema schema = new OutputSchema(orderedFields);

    ExtractionRequest request = new ExtractionRequest(
      "v1",
      new ExtractionRequest.Source("fileRef", "storage://voice-recordings/rec-1.m4a"),
      new ExtractionRequest.Extraction(Map.of(), null),
      Map.of(),
      new ExtractionRequest.Options(Boolean.TRUE, "es")
    );

    ExecutionPlan plan = planner.plan(request, schema);

    assertEquals(List.of("amount", "type"), plan.requiredFields());
    assertEquals(List.of("note"), plan.optionalFields());
    assertTrue(plan.includeTranscript());
  }

  @Test
  public void disablesTranscriptWhenOptionIsMissing() {
    ExecutionPlanner planner = new ExecutionPlanner();
    OutputSchema schema = new OutputSchema(Map.of("note", new FieldSchema("string", null, List.of(), false)));
    ExtractionRequest request = new ExtractionRequest(
      "v1",
      new ExtractionRequest.Source("fileRef", "storage://voice-recordings/rec-2.m4a"),
      new ExtractionRequest.Extraction(Map.of(), null),
      Map.of(),
      null
    );

    ExecutionPlan plan = planner.plan(request, schema);

    assertEquals(List.of(), plan.requiredFields());
    assertEquals(List.of("note"), plan.optionalFields());
    assertFalse(plan.includeTranscript());
  }
}
