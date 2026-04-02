package com.gonezo.audioextraction.application.usecase

import com.gonezo.audioextraction.domain.contract.ExtractionRequest
import com.gonezo.audioextraction.domain.contract.ExtractionResult

interface AudioExtractionUseCase {
  fun execute(request: ExtractionRequest): ExtractionResult
  fun cancel(requestId: String)
}
