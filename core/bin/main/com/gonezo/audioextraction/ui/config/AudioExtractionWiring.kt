package com.gonezo.audioextraction.ui.config

import com.gonezo.audioextraction.application.pipeline.ExecutionPlanner
import com.gonezo.audioextraction.application.usecase.DefaultAudioExtractionUseCase
import com.gonezo.audioextraction.infrastructure.assembler.ResultAssemblerImpl
import com.gonezo.audioextraction.infrastructure.contract.StrictRequestGuard
import com.gonezo.audioextraction.infrastructure.llm.DefaultChunkingService
import com.gonezo.audioextraction.infrastructure.llm.DefaultLlmGuard
import com.gonezo.audioextraction.infrastructure.llm.InMemoryExtractionTelemetry
import com.gonezo.audioextraction.infrastructure.llm.JsonPromptBuilder
import com.gonezo.audioextraction.infrastructure.llm.LlmConfig
import com.gonezo.audioextraction.infrastructure.llm.LlmStructuredExtractor
import com.gonezo.audioextraction.infrastructure.llm.RuleBasedLocalLlmEngine
import com.gonezo.audioextraction.infrastructure.llm.StrictJsonOutputParser
import com.gonezo.audioextraction.infrastructure.resolution.ResolutionCoordinatorImpl
import com.gonezo.audioextraction.infrastructure.source.DefaultSourceLoader
import com.gonezo.audioextraction.infrastructure.transcription.PlainTextTranscriptionEngine
import com.gonezo.audioextraction.ui.AudioExtractionFacade

object AudioExtractionWiring {
  fun createFacade(
    globalTimeoutMs: Long = 60_000,
    llmConfig: LlmConfig = LlmConfig(maxTokens = 2048, maxInputChars = 8000, timeoutMs = 5_000),
  ): AudioExtractionFacade {
    val extractor = LlmStructuredExtractor(
      llmEngine = RuleBasedLocalLlmEngine(),
      config = llmConfig,
      promptBuilder = JsonPromptBuilder(),
      outputParser = StrictJsonOutputParser(),
      llmGuard = DefaultLlmGuard(),
      chunkingService = DefaultChunkingService(),
      telemetry = InMemoryExtractionTelemetry(),
    )

    val useCase = DefaultAudioExtractionUseCase(
      requestGuard = StrictRequestGuard(),
      executionPlanner = ExecutionPlanner(),
      sourceLoader = DefaultSourceLoader(),
      transcriptionEngine = PlainTextTranscriptionEngine(),
      structuredExtractor = extractor,
      resolutionCoordinator = ResolutionCoordinatorImpl(),
      resultAssembler = ResultAssemblerImpl(),
      globalTimeoutMs = globalTimeoutMs,
    )

    return AudioExtractionFacade(useCase)
  }
}
