package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import com.gonezo.multiplatform.audioextraction.domain.error.AudioExtractionException;
import com.gonezo.multiplatform.audioextraction.domain.error.ErrorCode;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;

public final class DefaultLlmGuard implements LlmGuard {
  @Override
  public void validate(Transcript transcript, LlmConfig config) {
    String text = transcript == null || transcript.text() == null ? "" : transcript.text();
    if (text.isBlank()) {
      throw new AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Transcript is empty");
    }
    if (text.length() > config.maxInputChars()) {
      throw new AudioExtractionException(ErrorCode.POLICY_REJECTED, "Transcript exceeds maxInputChars");
    }
  }
}
