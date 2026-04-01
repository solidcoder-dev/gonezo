package com.gonezo.multiplatform.audioextraction.application;

import com.gonezo.multiplatform.audioextraction.contract.ExtractionRequest;
import com.gonezo.multiplatform.audioextraction.domain.model.SourceAudio;

public interface SourceLoader {
  SourceAudio load(ExtractionRequest request);
}
