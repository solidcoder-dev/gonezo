package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import com.gonezo.multiplatform.audioextraction.application.StructuredExtractor;
import com.gonezo.multiplatform.audioextraction.domain.model.Evidence;
import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class LlmStructuredExtractor implements StructuredExtractor {
  private final LlmEngine llmEngine;
  private final LlmConfig config;
  private final PromptBuilder promptBuilder;
  private final OutputParser outputParser;
  private final LlmGuard llmGuard;
  private final ChunkingService chunkingService;
  private final ExtractionTelemetry telemetry;

  public LlmStructuredExtractor(
    LlmEngine llmEngine,
    LlmConfig config,
    PromptBuilder promptBuilder,
    OutputParser outputParser,
    LlmGuard llmGuard,
    ChunkingService chunkingService,
    ExtractionTelemetry telemetry
  ) {
    this.llmEngine = llmEngine;
    this.config = config;
    this.promptBuilder = promptBuilder;
    this.outputParser = outputParser;
    this.llmGuard = llmGuard;
    this.chunkingService = chunkingService;
    this.telemetry = telemetry;
  }

  @Override
  public Map<String, List<FieldCandidate>> extract(Transcript transcript, ExecutionPlan plan, OutputSchema schema) {
    llmGuard.validate(transcript, config);

    List<Transcript> chunks = chunkingService.split(transcript, config.maxInputChars());
    Map<String, List<FieldCandidate>> merged = new LinkedHashMap<>();
    boolean successfulChunk = false;

    for (Transcript chunk : chunks) {
      long startMs = System.currentTimeMillis();
      String prompt = promptBuilder.build(chunk, schema, plan);
      boolean success = false;
      try {
        String output = llmEngine.infer(prompt);
        Map<String, List<FieldCandidate>> parsed = outputParser.parse(output);
        mergeCandidates(merged, parsed);
        success = true;
        successfulChunk = true;
      } catch (RuntimeException ignored) {
        // fallback below
      } finally {
        long duration = System.currentTimeMillis() - startMs;
        telemetry.llmCall("unknown", duration, prompt.length(), success);
      }
    }

    if (!successfulChunk || merged.isEmpty()) {
      return fallbackCandidates(transcript, schema);
    }

    return merged;
  }

  private void mergeCandidates(Map<String, List<FieldCandidate>> target, Map<String, List<FieldCandidate>> source) {
    for (Map.Entry<String, List<FieldCandidate>> entry : source.entrySet()) {
      target.computeIfAbsent(entry.getKey(), key -> new ArrayList<>()).addAll(entry.getValue());
    }
  }

  private Map<String, List<FieldCandidate>> fallbackCandidates(Transcript transcript, OutputSchema schema) {
    Map<String, List<FieldCandidate>> fallback = new LinkedHashMap<>();
    String text = transcript == null || transcript.text() == null ? "" : transcript.text();

    for (String fieldName : schema.fields().keySet()) {
      Object value = null;
      double confidence = 0.35;

      if ("type".equals(fieldName)) {
        String normalized = text.toLowerCase(java.util.Locale.ROOT);
        if (normalized.contains("income") || normalized.contains("salary")) {
          value = "income";
        } else if (normalized.contains("transfer")) {
          value = "transfer";
        } else {
          value = "expense";
        }
      } else if ("amount".equals(fieldName)) {
        Matcher matcher = Pattern.compile("([-+]?\\d+[\\d.,]*)").matcher(text);
        if (matcher.find()) {
          try {
            value = Double.parseDouble(matcher.group(1).replace(",", "."));
            confidence = 0.45;
          } catch (NumberFormatException ignored) {
            value = null;
          }
        }
      } else if ("occurredAt".equals(fieldName)) {
        value = java.time.Instant.now().toString();
      } else if ("note".equals(fieldName)) {
        value = text;
        confidence = 0.60;
      } else if ("tagNames".equals(fieldName)) {
        Matcher matcher = Pattern.compile("#([\\p{L}\\p{N}_-]+)").matcher(text);
        java.util.List<String> tags = new java.util.ArrayList<>();
        while (matcher.find()) {
          tags.add(matcher.group(1));
        }
        if (!tags.isEmpty()) {
          value = String.join(",", tags);
        }
      }

      if (value != null) {
        fallback.put(fieldName, List.of(new FieldCandidate(
          fieldName,
          value,
          confidence,
          List.of(new Evidence(text, 0L, 0L))
        )));
      }
    }

    return fallback;
  }
}
