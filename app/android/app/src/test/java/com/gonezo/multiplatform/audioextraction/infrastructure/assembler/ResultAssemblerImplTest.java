package com.gonezo.multiplatform.audioextraction.infrastructure.assembler;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.gonezo.multiplatform.audioextraction.contract.ExtractionResult;
import com.gonezo.multiplatform.audioextraction.domain.model.Evidence;
import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.Test;

public class ResultAssemblerImplTest {

  @Test
  public void assemblesCompleteOutcomeAndClampsConfidence() {
    ResultAssemblerImpl assembler = new ResultAssemblerImpl();
    ExecutionPlan plan = new ExecutionPlan(List.of("amount"), List.of("note"), true);
    Map<String, ResolvedField> resolved = new LinkedHashMap<>();
    resolved.put("amount", new ResolvedField(10.50D, 1.4D, List.of(new Evidence("10.50", 0L, 0L)), List.of()));
    resolved.put("note", new ResolvedField("Lunch", -0.3D, List.of(), List.of()));

    ExtractionResult result = assembler.assemble(
      "req-1",
      plan,
      resolved,
      List.of(),
      Map.of("extract", 20D),
      new Transcript("lunch ten fifty", List.of()),
      true,
      75D
    );

    assertEquals("complete", result.outcome());
    assertEquals(10.50D, ((Number) result.data().get("amount")).doubleValue(), 0.000001D);
    assertEquals("Lunch", result.data().get("note"));
    assertEquals(1D, result.fieldResults().get("amount").confidence(), 0.000001D);
    assertEquals(0D, result.fieldResults().get("note").confidence(), 0.000001D);
    assertEquals("lunch ten fifty", result.transcript());
  }

  @Test
  public void assemblesPartialOutcomeWhenRequiredFieldMissingButOptionalHasValue() {
    ResultAssemblerImpl assembler = new ResultAssemblerImpl();
    ExecutionPlan plan = new ExecutionPlan(List.of("amount"), List.of("note"), false);
    Map<String, ResolvedField> resolved = new LinkedHashMap<>();
    resolved.put("amount", new ResolvedField(null, 0D, List.of(), List.of("missing")));
    resolved.put("note", new ResolvedField("has-note", 0.6D, List.of(), List.of()));

    ExtractionResult result = assembler.assemble(
      "req-2",
      plan,
      resolved,
      List.of(),
      Map.of(),
      new Transcript("note", List.of()),
      false,
      10D
    );

    assertEquals("partial", result.outcome());
    assertTrue(result.data().containsKey("note"));
    assertNull(result.transcript());
  }

  @Test
  public void assemblesFailedOutcomeWhenNoDataCanBeResolved() {
    ResultAssemblerImpl assembler = new ResultAssemblerImpl();
    ExecutionPlan plan = new ExecutionPlan(List.of("amount"), List.of(), true);
    Map<String, ResolvedField> resolved = Map.of(
      "amount",
      new ResolvedField(null, 0D, List.of(), List.of("missing"))
    );

    ExtractionResult result = assembler.assemble(
      "req-3",
      plan,
      resolved,
      List.of("llm_failed"),
      Map.of(),
      new Transcript("", List.of()),
      true,
      11D
    );

    assertEquals("failed", result.outcome());
    assertTrue(result.data().isEmpty());
    assertEquals(List.of("llm_failed"), result.globalIssues());
  }
}

