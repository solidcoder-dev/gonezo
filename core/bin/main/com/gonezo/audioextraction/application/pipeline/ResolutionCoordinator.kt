package com.gonezo.audioextraction.application.pipeline

import com.gonezo.audioextraction.domain.model.ExtractionContext
import com.gonezo.audioextraction.domain.model.FieldCandidate
import com.gonezo.audioextraction.domain.model.ResolvedField
import com.gonezo.audioextraction.domain.schema.OutputSchema

interface ResolutionCoordinator {
  fun resolve(
    candidates: Map<String, List<FieldCandidate>>,
    schema: OutputSchema,
    context: ExtractionContext,
  ): Map<String, ResolvedField>
}
