package com.gonezo.audioextraction.ui

import com.gonezo.audioextraction.ui.dto.ExtractionRequestDto
import com.gonezo.audioextraction.ui.dto.ExtractionResultDto

class AudioExtractionController(
  private val facade: AudioExtractionFacade,
) {
  fun extract(request: ExtractionRequestDto): ExtractionResultDto = facade.execute(request)

  fun cancel(requestId: String) = facade.cancel(requestId)
}
