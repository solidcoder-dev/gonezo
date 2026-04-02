package com.gonezo.audioextraction.application.pipeline

import com.gonezo.audioextraction.domain.contract.ExtractionRequest
import com.gonezo.audioextraction.domain.contract.ExtractionResult

interface RequestGuard {
  fun validateRequest(request: ExtractionRequest)
  fun validateResult(result: ExtractionResult)
}
