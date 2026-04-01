package com.gonezo.multiplatform.audioextraction.application;

import com.gonezo.multiplatform.audioextraction.domain.model.ExtractionContext;
import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;
import java.util.List;
import java.util.Map;

public interface ResolutionCoordinator {
  Map<String, ResolvedField> resolve(
    Map<String, List<FieldCandidate>> candidates,
    OutputSchema schema,
    ExtractionContext context
  );
}
