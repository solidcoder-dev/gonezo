package com.gonezo.multiplatform.audioextraction.application;

import com.gonezo.multiplatform.audioextraction.contract.ExtractionRequest;
import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;
import java.util.ArrayList;
import java.util.List;

public class ExecutionPlanner {
  public ExecutionPlan plan(ExtractionRequest request, OutputSchema schema) {
    List<String> required = new ArrayList<>();
    List<String> optional = new ArrayList<>();

    for (String fieldName : schema.fields().keySet()) {
      if (schema.fields().get(fieldName).required()) {
        required.add(fieldName);
      } else {
        optional.add(fieldName);
      }
    }

    boolean includeTranscript = request.options() != null && Boolean.TRUE.equals(request.options().includeTranscript());
    return new ExecutionPlan(required, optional, includeTranscript);
  }
}
