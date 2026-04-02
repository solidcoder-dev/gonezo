package com.gonezo.audioextraction

import com.gonezo.audioextraction.application.pipeline.ExecutionPlanner
import com.gonezo.audioextraction.application.usecase.DefaultAudioExtractionUseCase
import com.gonezo.audioextraction.domain.contract.ExtractionRequest
import com.gonezo.audioextraction.domain.contract.ExtractionResult
import com.gonezo.audioextraction.domain.error.AudioExtractionException
import com.gonezo.audioextraction.domain.error.ErrorCode
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
import java.nio.charset.StandardCharsets
import java.util.Base64
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class AudioExtractionDesignComplianceTest {

  @Test
  fun `request guard rejects invalid request contract`() {
    val guard = StrictRequestGuard()

    val invalidRequest = ExtractionRequest(
      null,
      ExtractionRequest.Source("invalid", "x"),
      ExtractionRequest.Extraction(mapOf(), null),
      mapOf(),
      null,
    )

    assertThatThrownBy { guard.validateRequest(invalidRequest) }
      .isInstanceOf(AudioExtractionException::class.java)
      .extracting("code")
      .isEqualTo(ErrorCode.INVALID_REQUEST)
  }

  @Test
  fun `request guard rejects invalid result contract`() {
    val guard = StrictRequestGuard()

    val invalidResult = ExtractionResult(
      "v1",
      "complete",
      mapOf("a" to 1),
      mapOf(
        "a" to ExtractionResult.FieldResult(1, 1.5, listOf(), listOf("bad_code")),
      ),
      listOf(),
      ExtractionResult.ProcessingInfo("id", "v", 1.0, mapOf("x" to 1.0)),
      null,
    )

    assertThatThrownBy { guard.validateResult(invalidResult) }
      .isInstanceOf(AudioExtractionException::class.java)
      .extracting("code")
      .isEqualTo(ErrorCode.INVALID_REQUEST)
  }

  @Test
  fun `end to end executes validate plan load transcribe extract resolve assemble`() {
    val telemetry = InMemoryExtractionTelemetry()
    val useCase = DefaultAudioExtractionUseCase(
      StrictRequestGuard(),
      ExecutionPlanner(),
      DefaultSourceLoader(),
      PlainTextTranscriptionEngine(),
      LlmStructuredExtractor(
        RuleBasedLocalLlmEngine(),
        LlmConfig(512, 4000, 1_000),
        JsonPromptBuilder(),
        StrictJsonOutputParser(),
        DefaultLlmGuard(),
        DefaultChunkingService(),
        telemetry,
      ),
      ResolutionCoordinatorImpl(),
      ResultAssemblerImpl(),
      60_000,
    )

    val outputSchema = mapOf(
      "type" to mapOf("type" to "string", "enum" to listOf("income", "expense", "transfer")),
      "amount" to mapOf("type" to "number"),
      "note" to mapOf("type" to "string"),
    )

    val request = ExtractionRequest(
      "v1",
      ExtractionRequest.Source(
        "base64",
        Base64.getEncoder().encodeToString("salary 1200 #payroll".toByteArray(StandardCharsets.UTF_8)),
      ),
      ExtractionRequest.Extraction(
        mapOf(
          "type" to "object",
          "required" to listOf("type", "amount"),
          "properties" to outputSchema,
        ),
        "extract fields",
      ),
      mapOf(),
      ExtractionRequest.Options(true, "en"),
    )

    val result = useCase.execute(request)

    assertThat(result.schemaVersion).isEqualTo("v1")
    assertThat(result.outcome).isIn("complete", "partial")
    assertThat(result.fieldResults).containsKeys("type", "amount", "note")
    assertThat(result.processingInfo?.stageTimings?.keys).contains(
      "validate", "plan", "load", "transcribe", "extract", "resolve",
    )
    assertThat(result.transcript).contains("salary")
    assertThat(telemetry.entries()).isNotEmpty
  }
}
