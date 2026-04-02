package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import android.util.Log;

public final class AndroidLogExtractionTelemetry implements ExtractionTelemetry {
  private static final String LOG_TAG = "GonezoAudioExtract";

  @Override
  public void llmCall(String requestId, long durationMs, int inputSize, boolean success) {
    try {
      Log.i(
        LOG_TAG,
        "llm_call requestId=" + (requestId == null ? "unknown" : requestId)
          + " durationMs=" + durationMs
          + " inputSize=" + inputSize
          + " success=" + success
      );
    } catch (RuntimeException ignored) {
      // Ignore logging runtime failures to avoid impacting extraction flow.
    }
  }
}

