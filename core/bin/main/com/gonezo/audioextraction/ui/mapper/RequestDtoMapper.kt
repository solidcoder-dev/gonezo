package com.gonezo.audioextraction.ui.mapper

import com.gonezo.audioextraction.domain.contract.ExtractionRequest
import com.gonezo.audioextraction.ui.dto.ExtractionRequestDto

object RequestDtoMapper {
  fun toDomain(dto: ExtractionRequestDto): ExtractionRequest {
    return ExtractionRequest(
      schemaVersion = dto.schemaVersion,
      source = ExtractionRequest.Source(dto.source.type, dto.source.value),
      extraction = ExtractionRequest.Extraction(dto.extraction.outputSchema, dto.extraction.instructions),
      context = dto.context,
      options = dto.options?.let { ExtractionRequest.Options(it.includeTranscript, it.language) },
    )
  }
}
