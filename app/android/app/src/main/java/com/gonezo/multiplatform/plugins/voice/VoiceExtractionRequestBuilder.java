package com.gonezo.multiplatform.plugins.voice;

import com.gonezo.audioextraction.ui.dto.ExtractionRequestDto;
import java.util.Map;

public interface VoiceExtractionRequestBuilder {
  ExtractionRequestDto build(
    String sourceUrl,
    Map<String, Object> outputSchema,
    String accountId,
    String expectedType,
    String transcriptHint
  );
}
