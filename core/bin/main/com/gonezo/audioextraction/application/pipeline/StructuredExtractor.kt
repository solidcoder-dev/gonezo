package com.gonezo.audioextraction.application.pipeline

import com.gonezo.audioextraction.domain.model.ExecutionPlan
import com.gonezo.audioextraction.domain.model.FieldCandidate
import com.gonezo.audioextraction.domain.model.Transcript
import com.gonezo.audioextraction.domain.schema.OutputSchema

interface StructuredExtractor {
  fun extract(transcript: Transcript, plan: ExecutionPlan, schema: OutputSchema): Map<String, List<FieldCandidate>>
}
