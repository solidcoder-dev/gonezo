package com.gonezo.audioextraction.ui

import com.gonezo.audioextraction.application.usecase.AudioExtractionUseCase
import com.gonezo.audioextraction.ui.dto.ExtractionRequestDto
import com.gonezo.audioextraction.ui.dto.ExtractionResultDto
import com.gonezo.audioextraction.ui.mapper.RequestDtoMapper
import com.gonezo.audioextraction.ui.mapper.ResultDtoMapper

class AudioExtractionFacade(
  private val useCase: AudioExtractionUseCase,
) {
  fun execute(request: ExtractionRequestDto): ExtractionResultDto {
    val domainRequest = RequestDtoMapper.toDomain(request)
    val domainResult = useCase.execute(domainRequest)
    return ResultDtoMapper.fromDomain(domainResult)
  }

  fun cancel(requestId: String) {
    useCase.cancel(requestId)
  }
}
