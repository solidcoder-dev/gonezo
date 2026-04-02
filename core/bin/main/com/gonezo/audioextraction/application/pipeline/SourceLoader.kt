package com.gonezo.audioextraction.application.pipeline

import com.gonezo.audioextraction.domain.contract.ExtractionRequest
import com.gonezo.audioextraction.domain.model.SourceAudio

interface SourceLoader {
  fun load(request: ExtractionRequest): SourceAudio
}
