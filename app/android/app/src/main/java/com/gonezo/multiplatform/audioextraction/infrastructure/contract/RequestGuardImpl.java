package com.gonezo.multiplatform.audioextraction.infrastructure.contract;

import android.content.Context;
import android.util.Log;
import com.gonezo.multiplatform.audioextraction.application.RequestGuard;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionRequest;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionResult;
import com.gonezo.multiplatform.audioextraction.domain.error.AudioExtractionException;
import com.gonezo.multiplatform.audioextraction.domain.error.ErrorCode;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONObject;

public final class RequestGuardImpl implements RequestGuard {
  private static final String LOG_TAG = "GonezoAudioExtract";
  private static final String REQUEST_SCHEMA_PATH = "audio-extraction/schemas/extraction-request.v1.schema.json";
  private static final String RESULT_SCHEMA_PATH = "audio-extraction/schemas/extraction-result.v1.schema.json";
  private static final Set<String> ALLOWED_ISSUES = new HashSet<>(List.of("missing", "ambiguous", "invalid", "invalid_format"));

  private final SchemaAssetLoader schemaLoader;
  private final JsonSchemaValidator schemaValidator;

  public RequestGuardImpl(Context context) {
    this(new SchemaAssetLoader(context), new JsonSchemaValidator());
  }

  RequestGuardImpl(SchemaAssetLoader schemaLoader, JsonSchemaValidator schemaValidator) {
    this.schemaLoader = schemaLoader;
    this.schemaValidator = schemaValidator;
  }

  @Override
  public void validateRequest(ExtractionRequest request) {
    if (request == null) {
      logw("request_guard_invalid_request reason=request_is_required");
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "request is required");
    }

    JSONObject schema = schemaLoader.load(REQUEST_SCHEMA_PATH);
    List<String> errors = schemaValidator.validate(request.toJson(), schema);
    if (!errors.isEmpty()) {
      logw("request_guard_invalid_request reason=schema_validation_failed errors=" + String.join("|", errors));
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Invalid extraction request: " + String.join("; ", errors));
    }
    logi(
      "request_guard_request_valid schemaVersion=" + request.schemaVersion()
        + " sourceType=" + (request.source() == null ? "none" : request.source().type())
        + " contextKeys=" + request.context().keySet()
    );
  }

  @Override
  public void validateResult(ExtractionResult result) {
    if (result == null) {
      logw("request_guard_invalid_result reason=result_is_required");
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "result is required");
    }

    JSONObject schema = schemaLoader.load(RESULT_SCHEMA_PATH);
    List<String> errors = schemaValidator.validate(result.toJson(), schema);
    if (!errors.isEmpty()) {
      logw("request_guard_invalid_result reason=schema_validation_failed errors=" + String.join("|", errors));
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Invalid extraction result: " + String.join("; ", errors));
    }

    for (ExtractionResult.FieldResult fieldResult : result.fieldResults().values()) {
      if (fieldResult.confidence() < 0D || fieldResult.confidence() > 1D) {
        logw("request_guard_invalid_result reason=confidence_out_of_range");
        throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "confidence must be in [0,1]");
      }
      for (String issue : fieldResult.issues()) {
        if (!ALLOWED_ISSUES.contains(issue)) {
          logw("request_guard_invalid_result reason=unsupported_issue issue=" + issue);
          throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Unsupported issue code: " + issue);
        }
      }
    }
    logi(
      "request_guard_result_valid outcome=" + result.outcome()
        + " dataFields=" + result.data().size()
        + " fieldResults=" + result.fieldResults().size()
        + " globalIssues=" + result.globalIssues().size()
    );
  }

  private void logi(String message) {
    try {
      Log.i(LOG_TAG, message);
    } catch (RuntimeException ignored) {
      // Avoid breaking extraction if logging backend is unavailable.
    }
  }

  private void logw(String message) {
    try {
      Log.w(LOG_TAG, message);
    } catch (RuntimeException ignored) {
      // Avoid breaking extraction if logging backend is unavailable.
    }
  }
}
