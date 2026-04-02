package com.gonezo.multiplatform.audioextraction.infrastructure.logging;

import android.util.Log;
import com.gonezo.multiplatform.audioextraction.application.ResultAssembler;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionResult;
import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import java.util.List;
import java.util.Map;

public final class LoggingResultAssembler implements ResultAssembler {
  private static final String LOG_TAG = "GonezoAudioExtract";
  private final ResultAssembler delegate;

  public LoggingResultAssembler(ResultAssembler delegate) {
    this.delegate = delegate;
  }

  @Override
  public ExtractionResult assemble(
    String requestId,
    ExecutionPlan plan,
    Map<String, ResolvedField> resolvedFields,
    List<String> globalIssues,
    Map<String, Double> stageTimings,
    Transcript transcript,
    boolean includeTranscript,
    double processingTimeMs
  ) {
    long startedAt = System.currentTimeMillis();
    try {
      ExtractionResult result = delegate.assemble(
        requestId,
        plan,
        resolvedFields,
        globalIssues,
        stageTimings,
        transcript,
        includeTranscript,
        processingTimeMs
      );
      Log.i(
        LOG_TAG,
        "assemble_stage_ok requestId=" + requestId
          + " durationMs=" + (System.currentTimeMillis() - startedAt)
          + " outcome=" + result.outcome()
          + " dataFields=" + result.data().size()
          + " fieldResults=" + result.fieldResults().size()
          + " globalIssues=" + result.globalIssues().size()
          + " includeTranscript=" + includeTranscript
      );
      return result;
    } catch (RuntimeException ex) {
      Log.w(
        LOG_TAG,
        "assemble_stage_failed requestId=" + requestId
          + " durationMs=" + (System.currentTimeMillis() - startedAt)
          + " error=" + ex.getClass().getSimpleName(),
        ex
      );
      throw ex;
    }
  }
}

