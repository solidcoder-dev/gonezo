package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;

public interface PromptBuilder {
  String build(Transcript transcript, OutputSchema schema, ExecutionPlan plan);
}
