package com.gonezo.audioextraction.infrastructure.assembler

import com.gonezo.audioextraction.application.pipeline.ResultAssembler
import com.gonezo.audioextraction.domain.contract.ExtractionResult
import com.gonezo.audioextraction.domain.model.ExecutionPlan
import com.gonezo.audioextraction.domain.model.ResolvedField
import com.gonezo.audioextraction.domain.model.Transcript

class ResultAssemblerImpl : ResultAssembler {
  override fun assemble(
    requestId: String,
    plan: ExecutionPlan,
    resolvedFields: Map<String, ResolvedField>,
    globalIssues: List<String>,
    stageTimings: Map<String, Double>,
    transcript: Transcript,
    includeTranscript: Boolean,
    processingTimeMs: Double,
  ): ExtractionResult {
    val data = linkedMapOf<String, Any?>()
    val fieldResults = linkedMapOf<String, ExtractionResult.FieldResult>()

    for ((fieldName, field) in resolvedFields) {
      if (field.value != null) data[fieldName] = field.value
      fieldResults[fieldName] = ExtractionResult.FieldResult(field.value, clamp(field.confidence), field.evidence, field.issues)
    }

    return ExtractionResult(
      schemaVersion = "v1",
      outcome = resolveOutcome(plan, resolvedFields, globalIssues),
      data = data,
      fieldResults = fieldResults,
      globalIssues = globalIssues.toList(),
      processingInfo = ExtractionResult.ProcessingInfo(
        requestId = requestId,
        version = "audio-extraction-v1",
        processingTimeMs = processingTimeMs,
        stageTimings = stageTimings.toMap(),
      ),
      transcript = if (includeTranscript) transcript.text else null,
    )
  }

  private fun resolveOutcome(plan: ExecutionPlan, resolvedFields: Map<String, ResolvedField>, globalIssues: List<String>): String {
    val hasGlobalIssues = globalIssues.isNotEmpty()
    val hasAnyValue = resolvedFields.values.any { it.value != null }

    val missingRequired = plan.requiredFields.any { fieldName ->
      val field = resolvedFields[fieldName]
      field == null || field.value == null || field.issues.isNotEmpty()
    }

    if (!missingRequired && !hasGlobalIssues) return "complete"
    if (hasAnyValue) return "partial"
    return "failed"
  }

  private fun clamp(value: Double): Double = when {
    value < 0.0 -> 0.0
    value > 1.0 -> 1.0
    else -> value
  }
}
