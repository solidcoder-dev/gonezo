package com.gonezo.multiplatform.audioextraction.infrastructure.logging;

import android.util.Log;
import com.gonezo.multiplatform.audioextraction.application.ResolutionCoordinator;
import com.gonezo.multiplatform.audioextraction.domain.model.ExtractionContext;
import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;
import java.util.List;
import java.util.Map;

public final class LoggingResolutionCoordinator implements ResolutionCoordinator {
  private static final String LOG_TAG = "GonezoAudioExtract";
  private final ResolutionCoordinator delegate;

  public LoggingResolutionCoordinator(ResolutionCoordinator delegate) {
    this.delegate = delegate;
  }

  @Override
  public Map<String, ResolvedField> resolve(
    Map<String, List<FieldCandidate>> candidates,
    OutputSchema schema,
    ExtractionContext context
  ) {
    long startedAt = System.currentTimeMillis();
    String requestId = context == null || context.requestId() == null ? "unknown" : context.requestId();
    int candidateFieldCount = candidates == null ? 0 : candidates.size();
    int schemaFieldCount = schema == null ? 0 : schema.fields().size();
    try {
      Map<String, ResolvedField> resolved = delegate.resolve(candidates, schema, context);
      Log.i(
        LOG_TAG,
        "resolve_stage_ok requestId=" + requestId
          + " durationMs=" + (System.currentTimeMillis() - startedAt)
          + " schemaFields=" + schemaFieldCount
          + " candidateFields=" + candidateFieldCount
          + " resolvedFields=" + resolved.size()
          + " resolvedValues=" + countResolvedValues(resolved)
          + " issueCount=" + countIssues(resolved)
      );
      return resolved;
    } catch (RuntimeException ex) {
      Log.w(
        LOG_TAG,
        "resolve_stage_failed requestId=" + requestId
          + " durationMs=" + (System.currentTimeMillis() - startedAt)
          + " schemaFields=" + schemaFieldCount
          + " candidateFields=" + candidateFieldCount
          + " error=" + ex.getClass().getSimpleName(),
        ex
      );
      throw ex;
    }
  }

  private int countResolvedValues(Map<String, ResolvedField> resolved) {
    int total = 0;
    for (ResolvedField field : resolved.values()) {
      if (field != null && field.value() != null) {
        total += 1;
      }
    }
    return total;
  }

  private int countIssues(Map<String, ResolvedField> resolved) {
    int total = 0;
    for (ResolvedField field : resolved.values()) {
      if (field != null && field.issues() != null) {
        total += field.issues().size();
      }
    }
    return total;
  }
}

