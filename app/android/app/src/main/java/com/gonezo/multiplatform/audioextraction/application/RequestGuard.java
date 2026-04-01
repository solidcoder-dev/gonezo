package com.gonezo.multiplatform.audioextraction.application;

import com.gonezo.multiplatform.audioextraction.contract.ExtractionRequest;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionResult;

public interface RequestGuard {
  void validateRequest(ExtractionRequest request);

  void validateResult(ExtractionResult result);
}
