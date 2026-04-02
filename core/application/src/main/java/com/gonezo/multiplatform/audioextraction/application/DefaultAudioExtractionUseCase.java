package com.gonezo.multiplatform.audioextraction.application;

import com.gonezo.multiplatform.audioextraction.contract.ContractJsonMapper;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionRequest;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionResult;
import com.gonezo.multiplatform.audioextraction.domain.error.AudioExtractionException;
import com.gonezo.multiplatform.audioextraction.domain.error.ErrorCode;
import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.model.ExtractionContext;
import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.model.SourceAudio;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

public final class DefaultAudioExtractionUseCase implements AudioExtractionUseCase {
  private final RequestGuard requestGuard;
  private final ExecutionPlanner executionPlanner;
  private final SourceLoader sourceLoader;
  private final TranscriptionEngine transcriptionEngine;
  private final StructuredExtractor structuredExtractor;
  private final ResolutionCoordinator resolutionCoordinator;
  private final ResultAssembler resultAssembler;
  private final long globalTimeoutMs;

  private final Map<String, Boolean> cancelledByRequestId = new ConcurrentHashMap<>();

  public DefaultAudioExtractionUseCase(
    RequestGuard requestGuard,
    ExecutionPlanner executionPlanner,
    SourceLoader sourceLoader,
    TranscriptionEngine transcriptionEngine,
    StructuredExtractor structuredExtractor,
    ResolutionCoordinator resolutionCoordinator,
    ResultAssembler resultAssembler,
    long globalTimeoutMs
  ) {
    this.requestGuard = requestGuard;
    this.executionPlanner = executionPlanner;
    this.sourceLoader = sourceLoader;
    this.transcriptionEngine = transcriptionEngine;
    this.structuredExtractor = structuredExtractor;
    this.resolutionCoordinator = resolutionCoordinator;
    this.resultAssembler = resultAssembler;
    this.globalTimeoutMs = globalTimeoutMs;
  }

  @Override
  public ExtractionResult execute(ExtractionRequest request) {
    String requestId = UUID.randomUUID().toString();
    long startedAt = System.currentTimeMillis();
    cancelledByRequestId.put(requestId, Boolean.FALSE);

    Map<String, Double> stageTimings = new LinkedHashMap<>();
    List<String> globalIssues = new ArrayList<>();
    Transcript transcript = new Transcript("", List.of());

    OutputSchema outputSchema = resolveOutputSchema(request);
    ExecutionPlan plan = new ExecutionPlan(List.of(), List.of(), false);
    Map<String, List<FieldCandidate>> candidates = new LinkedHashMap<>();
    Map<String, ResolvedField> resolved = new LinkedHashMap<>();

    try {
      measureStage(stageTimings, "validate", () -> {
        requestGuard.validateRequest(request);
        return null;
      });
      ensureRunning(requestId, startedAt);

      plan = measureStage(stageTimings, "plan", () -> executionPlanner.plan(request, outputSchema));
      ensureRunning(requestId, startedAt);

      final ExtractionRequest requestWithRequestId = withRequestIdInContext(request, requestId);
      SourceAudio sourceAudio = measureStage(stageTimings, "load", () -> sourceLoader.load(requestWithRequestId));
      ensureRunning(requestId, startedAt);

      transcript = measureStage(stageTimings, "transcribe", () -> transcriptionEngine.transcribe(sourceAudio));
      ensureRunning(requestId, startedAt);

      Transcript finalTranscript = transcript;
      ExecutionPlan finalPlan = plan;
      candidates = measureStage(stageTimings, "extract", () -> structuredExtractor.extract(finalTranscript, finalPlan, outputSchema));
      ensureRunning(requestId, startedAt);

      Map<String, List<FieldCandidate>> finalCandidates = candidates;
      resolved = measureStage(
        stageTimings,
        "resolve",
        () -> resolutionCoordinator.resolve(finalCandidates, outputSchema, new ExtractionContext(requestId, request.context()))
      );
      ensureRunning(requestId, startedAt);

      final ExecutionPlan finalPlanForAssemble = plan;
      final Map<String, ResolvedField> finalResolved = resolved;
      final Transcript finalTranscriptForAssemble = transcript;
      final double processingTimeMs = elapsedSince(startedAt);
      ExtractionResult result = measureStage(
        stageTimings,
        "assemble",
        () -> resultAssembler.assemble(
          requestId,
          finalPlanForAssemble,
          finalResolved,
          globalIssues,
          stageTimings,
          finalTranscriptForAssemble,
          finalPlanForAssemble.includeTranscript(),
          processingTimeMs
        )
      );

      measureStage(stageTimings, "validateResult", () -> {
        requestGuard.validateResult(result);
        return null;
      });

      return result;
    } catch (AudioExtractionException ex) {
      globalIssues.add(ex.code().name().toLowerCase(Locale.ROOT));
      return failedResult(requestId, startedAt, stageTimings, globalIssues, transcript, outputSchema, plan, resolved);
    } catch (RuntimeException ex) {
      globalIssues.add(ErrorCode.RESOLUTION_FAILED.name().toLowerCase(Locale.ROOT));
      return failedResult(requestId, startedAt, stageTimings, globalIssues, transcript, outputSchema, plan, resolved);
    } finally {
      cancelledByRequestId.remove(requestId);
    }
  }

  @Override
  public void cancel(String requestId) {
    if (requestId == null || requestId.isBlank()) {
      return;
    }
    cancelledByRequestId.put(requestId, Boolean.TRUE);
  }

  private OutputSchema resolveOutputSchema(ExtractionRequest request) {
    if (request == null || request.extraction() == null) {
      return new OutputSchema(Map.of());
    }
    return OutputSchema.fromJson(ContractJsonMapper.toJsonObject(request.extraction().outputSchema()));
  }

  private ExtractionRequest withRequestIdInContext(ExtractionRequest request, String requestId) {
    if (request == null) {
      return null;
    }
    Map<String, Object> context = new LinkedHashMap<>(request.context());
    context.put("requestId", requestId);
    return new ExtractionRequest(
      request.schemaVersion(),
      request.source(),
      request.extraction(),
      context,
      request.options()
    );
  }

  private ExtractionResult failedResult(
    String requestId,
    long startedAt,
    Map<String, Double> stageTimings,
    List<String> globalIssues,
    Transcript transcript,
    OutputSchema outputSchema,
    ExecutionPlan plan,
    Map<String, ResolvedField> resolved
  ) {
    Map<String, ResolvedField> fallbackResolved = new LinkedHashMap<>(resolved);
    for (String fieldName : outputSchema.fields().keySet()) {
      if (fallbackResolved.containsKey(fieldName)) {
        continue;
      }
      boolean required = outputSchema.fields().get(fieldName).required();
      fallbackResolved.put(
        fieldName,
        new ResolvedField(null, 0D, List.of(), required ? List.of("missing") : List.of())
      );
    }

    ExtractionResult result = resultAssembler.assemble(
      requestId,
      plan,
      fallbackResolved,
      globalIssues,
      stageTimings,
      transcript,
      plan.includeTranscript(),
      elapsedSince(startedAt)
    );

    try {
      requestGuard.validateResult(result);
    } catch (RuntimeException ignored) {
      // If failure result is still invalid it should still be returned for diagnostics.
    }
    return result;
  }

  private void ensureRunning(String requestId, long startedAt) {
    if (Boolean.TRUE.equals(cancelledByRequestId.get(requestId))) {
      throw new AudioExtractionException(ErrorCode.POLICY_REJECTED, "Request was cancelled");
    }

    if (elapsedSince(startedAt) > globalTimeoutMs) {
      throw new AudioExtractionException(ErrorCode.POLICY_REJECTED, "Global timeout reached");
    }
  }

  private double elapsedSince(long startedAt) {
    return (double) (System.currentTimeMillis() - startedAt);
  }

  private <T> T measureStage(Map<String, Double> stageTimings, String stage, Supplier<T> operation) {
    long startedAt = System.currentTimeMillis();
    try {
      return operation.get();
    } finally {
      stageTimings.put(stage, (double) (System.currentTimeMillis() - startedAt));
    }
  }
}
