package com.gonezo.multiplatform.audioextraction.infrastructure.logging;

import android.util.Log;
import com.gonezo.multiplatform.audioextraction.application.AudioExtractionUseCase;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionRequest;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionResult;
import java.util.Map;

public final class LoggingAudioExtractionUseCase implements AudioExtractionUseCase {
  private static final String LOG_TAG = "GonezoAudioExtract";
  private final AudioExtractionUseCase delegate;

  public LoggingAudioExtractionUseCase(AudioExtractionUseCase delegate) {
    this.delegate = delegate;
  }

  @Override
  public ExtractionResult execute(ExtractionRequest request) {
    long startedAt = System.currentTimeMillis();
    logi(
      "pipeline_execute_start schemaVersion=" + safe(request == null ? null : request.schemaVersion())
        + " sourceType=" + safe(sourceType(request))
        + " schemaFields=" + schemaFields(request)
        + " contextKeys=" + contextKeys(request)
        + " includeTranscript=" + includeTranscript(request)
    );
    try {
      ExtractionResult result = delegate.execute(request);
      String requestId = processingRequestId(result);
      double processingTimeMs = processingTimeMs(result);
      logi(
        "pipeline_execute_end requestId=" + requestId
          + " outcome=" + safe(result == null ? null : result.outcome())
          + " processingTimeMs=" + processingTimeMs
          + " wallTimeMs=" + (System.currentTimeMillis() - startedAt)
          + " dataFields=" + mapSize(result == null ? null : result.data())
          + " fieldResults=" + mapSize(result == null ? null : result.fieldResults())
          + " globalIssues=" + listSize(result == null ? null : result.globalIssues())
      );
      return result;
    } catch (RuntimeException ex) {
      logw(
        "pipeline_execute_failed wallTimeMs=" + (System.currentTimeMillis() - startedAt)
          + " error=" + ex.getClass().getSimpleName()
          + " message=" + safe(ex.getMessage()),
        ex
      );
      throw ex;
    }
  }

  @Override
  public void cancel(String requestId) {
    logi("pipeline_cancel_requested requestId=" + safe(requestId));
    delegate.cancel(requestId);
  }

  private String sourceType(ExtractionRequest request) {
    if (request == null || request.source() == null) {
      return "none";
    }
    return request.source().type();
  }

  private int schemaFields(ExtractionRequest request) {
    if (request == null || request.extraction() == null || request.extraction().outputSchema() == null) {
      return 0;
    }
    return request.extraction().outputSchema().size();
  }

  private int contextKeys(ExtractionRequest request) {
    if (request == null || request.context() == null) {
      return 0;
    }
    return request.context().size();
  }

  private boolean includeTranscript(ExtractionRequest request) {
    return request != null
      && request.options() != null
      && Boolean.TRUE.equals(request.options().includeTranscript());
  }

  private String processingRequestId(ExtractionResult result) {
    if (result == null || result.processingInfo() == null || result.processingInfo().requestId() == null) {
      return "unknown";
    }
    return result.processingInfo().requestId();
  }

  private double processingTimeMs(ExtractionResult result) {
    if (result == null || result.processingInfo() == null) {
      return -1D;
    }
    return result.processingInfo().processingTimeMs();
  }

  private int mapSize(Map<?, ?> value) {
    return value == null ? 0 : value.size();
  }

  private int listSize(java.util.List<?> value) {
    return value == null ? 0 : value.size();
  }

  private String safe(String value) {
    if (value == null || value.isBlank()) {
      return "none";
    }
    String normalized = value.replace('\n', ' ').trim();
    return normalized.length() <= 220 ? normalized : normalized.substring(0, 220);
  }

  private void logi(String message) {
    try {
      Log.i(LOG_TAG, message);
    } catch (RuntimeException ignored) {
      // Ignore logging backend failures to preserve extraction flow.
    }
  }

  private void logw(String message, RuntimeException ex) {
    try {
      Log.w(LOG_TAG, message, ex);
    } catch (RuntimeException ignored) {
      // Ignore logging backend failures to preserve extraction flow.
    }
  }
}
