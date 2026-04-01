package com.gonezo.multiplatform.audioextraction.application;

import com.gonezo.multiplatform.audioextraction.contract.ExtractionResult;
import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import java.util.Map;

public interface ResultAssembler {
  ExtractionResult assemble(
    String requestId,
    ExecutionPlan plan,
    Map<String, ResolvedField> resolvedFields,
    java.util.List<String> globalIssues,
    Map<String, Double> stageTimings,
    Transcript transcript,
    boolean includeTranscript,
    double processingTimeMs
  );
}
