package com.gonezo.audioextraction.ui

import com.gonezo.audioextraction.application.pipeline.SourceLoader
import com.gonezo.audioextraction.application.pipeline.TranscriptionEngine
import com.gonezo.audioextraction.domain.model.Segment
import com.gonezo.audioextraction.domain.model.SourceAudio
import com.gonezo.audioextraction.domain.model.Transcript
import com.gonezo.audioextraction.infrastructure.llm.LlmConfig
import com.gonezo.audioextraction.ui.config.AudioExtractionWiring
import com.gonezo.audioextraction.ui.dto.ExtractionRequestDto
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.Base64

class AudioExtractionWiringTest {
  @Test
  fun `createFacade accepts platform transcription engine injection`() {
    val sourceLoader = object : SourceLoader {
      override fun load(request: com.gonezo.audioextraction.domain.contract.ExtractionRequest): SourceAudio {
        val source = request.source ?: throw IllegalArgumentException("source is required")
        val value = source.value ?: throw IllegalArgumentException("source value is required")
        return SourceAudio(
          bytes = Base64.getDecoder().decode(value),
          mimeType = "audio/raw",
          sourceRef = value,
          metadata = mapOf("requestId" to "test-request"),
        )
      }
    }
    val transcriptionEngine = object : TranscriptionEngine {
      override fun transcribe(audio: SourceAudio): Transcript {
        val text = String(audio.bytes)
        return Transcript(text = text, segments = listOf(Segment(text, 0L, 0L)))
      }
    }

    val facade = AudioExtractionWiring.createFacade(
      globalTimeoutMs = 60_000,
      llmConfig = LlmConfig(1024, 4000, 3_000),
      sourceLoader = sourceLoader,
      transcriptionEngine = transcriptionEngine,
    )

    val result = facade.execute(
      ExtractionRequestDto(
        schemaVersion = "v1",
        source = ExtractionRequestDto.SourceDto(
          type = "base64",
          value = Base64.getEncoder().encodeToString("expense 42.10 groceries".toByteArray()),
        ),
        extraction = ExtractionRequestDto.ExtractionDto(
          outputSchema = mapOf(
            "type" to "object",
            "required" to listOf("type", "amount"),
            "properties" to mapOf(
              "type" to mapOf("type" to "string", "enum" to listOf("expense", "income", "transfer")),
              "amount" to mapOf("type" to "number"),
            ),
          ),
          instructions = "Extract fields",
        ),
        context = emptyMap<String, Any?>(),
        options = ExtractionRequestDto.OptionsDto(includeTranscript = true, language = null),
      ),
    )

    assertThat(result.schemaVersion).isEqualTo("v1")
    assertThat(result.outcome).isIn("complete", "partial")
    assertThat(result.fieldResults).containsKeys("type", "amount")
  }
}
