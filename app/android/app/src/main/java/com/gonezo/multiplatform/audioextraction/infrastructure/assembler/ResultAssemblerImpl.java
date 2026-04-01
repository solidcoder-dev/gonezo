package com.gonezo.multiplatform.audioextraction.infrastructure.assembler;

import com.gonezo.multiplatform.audioextraction.application.ResultAssembler;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionResult;
import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ResultAssemblerImpl implements ResultAssembler {
  @Override
  public ExtractionResult assemble(
    String requestId,
    ExecutionPlan plan,
    Map<String, ResolvedField> resolvedFields,
    List<String> globalIssues,
    Map<String, Double> stageTimings,
    Transcript transcript,
    boolean includeTranscript,
    double processingTimeMs
  ) {
    Map<String, Object> data = new LinkedHashMap<>();
    Map<String, ExtractionResult.FieldResult> fieldResults = new LinkedHashMap<>();

    for (Map.Entry<String, ResolvedField> entry : resolvedFields.entrySet()) {
      ResolvedField field = entry.getValue();
      if (field.value() != null) {
        data.put(entry.getKey(), field.value());
      }
      fieldResults.put(
        entry.getKey(),
        new ExtractionResult.FieldResult(
          field.value(),
          clamp(field.confidence()),
          field.evidence(),
          field.issues()
        )
      );
    }

    String outcome = resolveOutcome(plan, resolvedFields, globalIssues);

    return new ExtractionResult(
      "v1",
      outcome,
      data,
      fieldResults,
      globalIssues == null ? List.of() : List.copyOf(globalIssues),
      new ExtractionResult.ProcessingInfo(
        requestId,
        "audio-extraction-v1",
        processingTimeMs,
        stageTimings == null ? Map.of() : Map.copyOf(stageTimings)
      ),
      includeTranscript && transcript != null ? transcript.text() : null
    );
  }

  private String resolveOutcome(
    ExecutionPlan plan,
    Map<String, ResolvedField> resolvedFields,
    List<String> globalIssues
  ) {
    boolean hasGlobalIssues = globalIssues != null && !globalIssues.isEmpty();
    boolean hasAnyValue = resolvedFields.values().stream().anyMatch(field -> field.value() != null);

    boolean missingRequired = false;
    for (String fieldName : plan.requiredFields()) {
      ResolvedField field = resolvedFields.get(fieldName);
      if (field == null || field.value() == null || !field.issues().isEmpty()) {
        missingRequired = true;
        break;
      }
    }

    if (!missingRequired && !hasGlobalIssues) {
      return "complete";
    }
    if (hasAnyValue) {
      return "partial";
    }
    return "failed";
  }

  private double clamp(double value) {
    if (value < 0D) {
      return 0D;
    }
    if (value > 1D) {
      return 1D;
    }
    return value;
  }
}
