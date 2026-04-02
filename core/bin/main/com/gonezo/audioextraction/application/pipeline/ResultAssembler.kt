package com.gonezo.audioextraction.application.pipeline

import com.gonezo.audioextraction.domain.contract.ExtractionResult
import com.gonezo.audioextraction.domain.model.ExecutionPlan
import com.gonezo.audioextraction.domain.model.ResolvedField
import com.gonezo.audioextraction.domain.model.Transcript

interface ResultAssembler {
  fun assemble(
    requestId: String,
    plan: ExecutionPlan,
    resolvedFields: Map<String, ResolvedField>,
    globalIssues: List<String>,
    stageTimings: Map<String, Double>,
    transcript: Transcript,
    includeTranscript: Boolean,
    processingTimeMs: Double,
  ): ExtractionResult
}
