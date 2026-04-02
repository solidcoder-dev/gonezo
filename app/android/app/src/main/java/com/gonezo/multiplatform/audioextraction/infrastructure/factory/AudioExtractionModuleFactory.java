package com.gonezo.multiplatform.audioextraction.infrastructure.factory;

import android.content.Context;
import com.gonezo.multiplatform.audioextraction.application.AudioExtractionUseCase;
import com.gonezo.multiplatform.audioextraction.application.DefaultAudioExtractionUseCase;
import com.gonezo.multiplatform.audioextraction.application.ExecutionPlanner;
import com.gonezo.multiplatform.audioextraction.contract.ContractJsonMapper;
import com.gonezo.multiplatform.audioextraction.domain.error.AudioExtractionException;
import com.gonezo.multiplatform.audioextraction.domain.error.ErrorCode;
import com.gonezo.multiplatform.audioextraction.infrastructure.assembler.ResultAssemblerImpl;
import com.gonezo.multiplatform.audioextraction.infrastructure.asr.VoskTranscriptionEngine;
import com.gonezo.multiplatform.audioextraction.infrastructure.contract.RequestGuardImpl;
import com.gonezo.multiplatform.audioextraction.infrastructure.llm.DefaultChunkingService;
import com.gonezo.multiplatform.audioextraction.infrastructure.llm.DefaultLlmGuard;
import com.gonezo.multiplatform.audioextraction.infrastructure.llm.AndroidLogExtractionTelemetry;
import com.gonezo.multiplatform.audioextraction.infrastructure.llm.JsonPromptBuilder;
import com.gonezo.multiplatform.audioextraction.infrastructure.llm.LlmConfig;
import com.gonezo.multiplatform.audioextraction.infrastructure.llm.LlmStructuredExtractor;
import com.gonezo.multiplatform.audioextraction.infrastructure.llm.RuleBasedLocalLlmEngine;
import com.gonezo.multiplatform.audioextraction.infrastructure.llm.StrictJsonOutputParser;
import com.gonezo.multiplatform.audioextraction.infrastructure.logging.LoggingAudioExtractionUseCase;
import com.gonezo.multiplatform.audioextraction.infrastructure.logging.LoggingResolutionCoordinator;
import com.gonezo.multiplatform.audioextraction.infrastructure.logging.LoggingResultAssembler;
import com.gonezo.multiplatform.audioextraction.infrastructure.logging.LoggingStructuredExtractor;
import com.gonezo.multiplatform.audioextraction.infrastructure.resolution.ResolutionCoordinatorImpl;
import com.gonezo.multiplatform.audioextraction.infrastructure.source.AndroidSourceLoader;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import org.json.JSONException;
import org.json.JSONObject;

public final class AudioExtractionModuleFactory {
  private static final String TRANSACTION_OUTPUT_SCHEMA_PATH = "audio-extraction/schemas/transaction-output.v1.schema.json";

  private AudioExtractionModuleFactory() {
  }

  public static AudioExtractionUseCase create(Context context) {
    LlmStructuredExtractor llmExtractor = new LlmStructuredExtractor(
      new RuleBasedLocalLlmEngine(),
      new LlmConfig(512, 4000, 20000L),
      new JsonPromptBuilder(),
      new StrictJsonOutputParser(),
      new DefaultLlmGuard(),
      new DefaultChunkingService(),
      new AndroidLogExtractionTelemetry()
    );
    AudioExtractionUseCase useCase = new DefaultAudioExtractionUseCase(
      new RequestGuardImpl(context),
      new ExecutionPlanner(),
      new AndroidSourceLoader(context),
      new VoskTranscriptionEngine(),
      new LoggingStructuredExtractor(llmExtractor),
      new LoggingResolutionCoordinator(new ResolutionCoordinatorImpl()),
      new LoggingResultAssembler(new ResultAssemblerImpl()),
      20000L
    );
    return new LoggingAudioExtractionUseCase(useCase);
  }

  public static JSONObject loadTransactionOutputSchema(Context context) {
    try (BufferedReader reader = new BufferedReader(new InputStreamReader(
      context.getAssets().open(TRANSACTION_OUTPUT_SCHEMA_PATH),
      StandardCharsets.UTF_8
    ))) {
      StringBuilder content = new StringBuilder();
      String line;
      while ((line = reader.readLine()) != null) {
        content.append(line).append('\n');
      }
      return new JSONObject(content.toString());
    } catch (IOException | JSONException ex) {
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load transaction output schema", ex);
    }
  }
}
