package com.gonezo.multiplatform.audioextraction.application;

import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;
import java.util.List;
import java.util.Map;

public interface StructuredExtractor {
  Map<String, List<FieldCandidate>> extract(Transcript transcript, ExecutionPlan plan, OutputSchema schema);
}
