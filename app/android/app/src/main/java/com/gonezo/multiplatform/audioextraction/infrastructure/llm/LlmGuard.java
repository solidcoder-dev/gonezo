package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;

public interface LlmGuard {
  void validate(Transcript transcript, LlmConfig config);
}
