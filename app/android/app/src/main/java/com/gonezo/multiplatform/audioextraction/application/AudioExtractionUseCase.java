package com.gonezo.multiplatform.audioextraction.application;

import com.gonezo.multiplatform.audioextraction.contract.ExtractionRequest;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionResult;

public interface AudioExtractionUseCase {
  ExtractionResult execute(ExtractionRequest request);

  void cancel(String requestId);
}
