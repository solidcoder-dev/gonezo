package com.gonezo.multiplatform.audioextraction.infrastructure.logging;

import android.util.Log;
import com.gonezo.multiplatform.audioextraction.application.StructuredExtractor;
import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;
import java.util.List;
import java.util.Map;

public final class LoggingStructuredExtractor implements StructuredExtractor {
  private static final String LOG_TAG = "GonezoAudioExtract";
  private final StructuredExtractor delegate;

  public LoggingStructuredExtractor(StructuredExtractor delegate) {
    this.delegate = delegate;
  }

  @Override
  public Map<String, List<FieldCandidate>> extract(Transcript transcript, ExecutionPlan plan, OutputSchema schema) {
    long startedAt = System.currentTimeMillis();
    int transcriptLength = transcript == null || transcript.text() == null ? 0 : transcript.text().length();
    int schemaFields = schema == null ? 0 : schema.fields().size();
    int requiredFields = plan == null ? 0 : plan.requiredFields().size();
    int optionalFields = plan == null ? 0 : plan.optionalFields().size();
    try {
      Map<String, List<FieldCandidate>> extracted = delegate.extract(transcript, plan, schema);
      Log.i(
        LOG_TAG,
        "extract_stage_ok durationMs=" + (System.currentTimeMillis() - startedAt)
          + " transcriptLength=" + transcriptLength
          + " schemaFields=" + schemaFields
          + " requiredFields=" + requiredFields
          + " optionalFields=" + optionalFields
          + " candidateFields=" + extracted.size()
          + " candidateCount=" + countCandidates(extracted)
      );
      return extracted;
    } catch (RuntimeException ex) {
      Log.w(
        LOG_TAG,
        "extract_stage_failed durationMs=" + (System.currentTimeMillis() - startedAt)
          + " transcriptLength=" + transcriptLength
          + " schemaFields=" + schemaFields
          + " requiredFields=" + requiredFields
          + " optionalFields=" + optionalFields
          + " error=" + ex.getClass().getSimpleName()
          + " message=" + sanitizeMessage(ex.getMessage()),
        ex
      );
      throw ex;
    }
  }

  private int countCandidates(Map<String, List<FieldCandidate>> extracted) {
    int total = 0;
    for (List<FieldCandidate> candidates : extracted.values()) {
      total += candidates == null ? 0 : candidates.size();
    }
    return total;
  }

  private String sanitizeMessage(String message) {
    if (message == null || message.isBlank()) {
      return "none";
    }
    String normalized = message.replace('\n', ' ').trim();
    return normalized.length() <= 180 ? normalized : normalized.substring(0, 180);
  }
}

