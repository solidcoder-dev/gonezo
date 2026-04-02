package com.gonezo.audioextraction.infrastructure.llm

import com.gonezo.audioextraction.application.support.ExtractionRequestScope
import com.gonezo.audioextraction.application.pipeline.StructuredExtractor
import com.gonezo.audioextraction.domain.model.Evidence
import com.gonezo.audioextraction.domain.model.ExecutionPlan
import com.gonezo.audioextraction.domain.model.FieldCandidate
import com.gonezo.audioextraction.domain.model.Transcript
import com.gonezo.audioextraction.domain.schema.OutputSchema
import java.time.Instant
import java.util.Locale
import java.util.regex.Pattern

class LlmStructuredExtractor(
  private val llmEngine: LlmEngine,
  private val config: LlmConfig,
  private val promptBuilder: PromptBuilder,
  private val outputParser: OutputParser,
  private val llmGuard: LlmGuard,
  private val chunkingService: ChunkingService,
  private val telemetry: ExtractionTelemetry,
) : StructuredExtractor {
  override fun extract(
    transcript: Transcript,
    plan: ExecutionPlan,
    schema: OutputSchema,
  ): Map<String, List<FieldCandidate>> {
    llmGuard.validate(transcript, config)

    val chunks = chunkingService.split(transcript, config.maxInputChars)
    val merged = linkedMapOf<String, MutableList<FieldCandidate>>()
    var successfulChunk = false
    val requestId = ExtractionRequestScope.currentRequestId() ?: "unknown"

    for (chunk in chunks) {
      val startedAt = System.currentTimeMillis()
      val prompt = promptBuilder.build(chunk, schema, plan)
      var success = false
      try {
        val output = llmEngine.infer(prompt)
        val parsed = outputParser.parse(output)
        mergeCandidates(merged, parsed)
        success = true
        successfulChunk = true
      } catch (_: RuntimeException) {
        // fallback below
      } finally {
        telemetry.llmCall(requestId, System.currentTimeMillis() - startedAt, prompt.length, success)
      }
    }

    if (!successfulChunk || merged.isEmpty()) {
      return fallbackCandidates(transcript, schema)
    }

    return merged
  }

  private fun mergeCandidates(
    target: MutableMap<String, MutableList<FieldCandidate>>,
    source: Map<String, List<FieldCandidate>>,
  ) {
    for ((fieldName, candidates) in source) {
      target.getOrPut(fieldName) { mutableListOf() }.addAll(candidates)
    }
  }

  private fun fallbackCandidates(
    transcript: Transcript,
    schema: OutputSchema,
  ): Map<String, List<FieldCandidate>> {
    val fallback = linkedMapOf<String, List<FieldCandidate>>()
    val text = transcript.text

    for ((fieldName, fieldSchema) in schema.fields) {
      val inferred = inferFallbackValue(fieldName, fieldSchema.type, fieldSchema.format, text)
      if (inferred != null) {
        fallback[fieldName] = listOf(
          FieldCandidate(
            fieldName = fieldName,
            rawValue = inferred.first,
            confidence = inferred.second,
            evidence = listOf(Evidence(text, 0L, 0L)),
          )
        )
      }
    }

    return fallback
  }

  private fun inferFallbackValue(
    fieldName: String,
    fieldType: String,
    fieldFormat: String?,
    text: String,
  ): Pair<Any, Double>? {
    if (fieldType == "number" || fieldType == "integer") {
      val matcher = Pattern.compile("([-+]?\\d+[\\d.,]*)").matcher(text)
      if (matcher.find()) {
        val parsed = matcher.group(1).replace(",", ".").toDoubleOrNull() ?: return null
        return if (fieldType == "integer") parsed.toLong() to 0.40 else parsed to 0.45
      }
      return null
    }

    if (fieldType == "string" && fieldFormat == "date-time") {
      return Instant.now().toString() to 0.35
    }

    if (fieldName.lowercase(Locale.ROOT).contains("type")) {
      val normalized = text.lowercase(Locale.ROOT)
      val value = when {
        normalized.contains("income") || normalized.contains("salary") -> "income"
        normalized.contains("transfer") -> "transfer"
        else -> "expense"
      }
      return value to 0.35
    }

    if (fieldType == "string") {
      if (text.isBlank()) {
        return null
      }
      return text to 0.60
    }

    return null
  }
}
