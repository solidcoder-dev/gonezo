package com.gonezo.audioextraction.ui.mapper

import com.gonezo.audioextraction.domain.contract.ExtractionResult
import com.gonezo.audioextraction.ui.dto.ExtractionResultDto

object ResultDtoMapper {
  fun fromDomain(result: ExtractionResult): ExtractionResultDto {
    return ExtractionResultDto(
      schemaVersion = result.schemaVersion,
      outcome = result.outcome,
      data = result.data,
      fieldResults = result.fieldResults.mapValues { (_, field) ->
        ExtractionResultDto.FieldResultDto(
          value = field.value,
          confidence = field.confidence,
          evidence = field.evidence.map { evidence ->
            ExtractionResultDto.EvidenceDto(evidence.text, evidence.startMs, evidence.endMs)
          },
          issues = field.issues,
        )
      },
      globalIssues = result.globalIssues,
      processingInfo = result.processingInfo?.let {
        ExtractionResultDto.ProcessingInfoDto(
          requestId = it.requestId,
          version = it.version,
          processingTimeMs = it.processingTimeMs,
          stageTimings = it.stageTimings,
        )
      },
      transcript = result.transcript,
    )
  }
}
