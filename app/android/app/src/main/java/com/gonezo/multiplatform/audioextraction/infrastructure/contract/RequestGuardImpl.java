package com.gonezo.multiplatform.audioextraction.infrastructure.contract;

import android.content.Context;
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
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "request is required");
    }

    JSONObject schema = schemaLoader.load(REQUEST_SCHEMA_PATH);
    List<String> errors = schemaValidator.validate(request.toJson(), schema);
    if (!errors.isEmpty()) {
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Invalid extraction request: " + String.join("; ", errors));
    }
  }

  @Override
  public void validateResult(ExtractionResult result) {
    if (result == null) {
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "result is required");
    }

    JSONObject schema = schemaLoader.load(RESULT_SCHEMA_PATH);
    List<String> errors = schemaValidator.validate(result.toJson(), schema);
    if (!errors.isEmpty()) {
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Invalid extraction result: " + String.join("; ", errors));
    }

    for (ExtractionResult.FieldResult fieldResult : result.fieldResults().values()) {
      if (fieldResult.confidence() < 0D || fieldResult.confidence() > 1D) {
        throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "confidence must be in [0,1]");
      }
      for (String issue : fieldResult.issues()) {
        if (!ALLOWED_ISSUES.contains(issue)) {
          throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Unsupported issue code: " + issue);
        }
      }
    }
  }
}
