package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class RuleBasedLocalLlmEngine implements LlmEngine {
  @Override
  public String infer(String prompt) {
    try {
      JSONObject input = new JSONObject(prompt);
      String transcript = input.optString("transcript", "");
      String normalized = transcript.toLowerCase(Locale.ROOT);

      String type = "expense";
      if (normalized.contains("income") || normalized.contains("salary") || normalized.contains("pay")) {
        type = "income";
      } else if (normalized.contains("transfer")) {
        type = "transfer";
      }

      Matcher amountMatcher = Pattern.compile("([-+]?\\d+[\\d.,]*)").matcher(transcript);
      Double amount = null;
      if (amountMatcher.find()) {
        String parsed = amountMatcher.group(1).replace(",", ".");
        try {
          amount = Double.parseDouble(parsed);
        } catch (NumberFormatException ignored) {
          amount = null;
        }
      }

      Set<String> tags = new LinkedHashSet<>();
      Matcher tagMatcher = Pattern.compile("#([\\p{L}\\p{N}_-]+)").matcher(transcript);
      while (tagMatcher.find()) {
        tags.add(tagMatcher.group(1));
      }

      JSONObject result = new JSONObject();
      JSONObject fieldCandidates = new JSONObject();
      put(fieldCandidates, "type", candidateArray(type, 0.82, transcript));
      put(fieldCandidates, "occurredAt", candidateArray(Instant.now().toString(), 0.50, transcript));
      put(fieldCandidates, "note", candidateArray(transcript, 0.90, transcript));

      if (amount != null) {
        put(fieldCandidates, "amount", candidateArray(amount, 0.78, amountMatcher.group(1)));
      }

      if (!tags.isEmpty()) {
        put(fieldCandidates, "tagNames", candidateArray(String.join(",", tags), 0.60, transcript));
      }

      put(result, "fieldCandidates", fieldCandidates);
      return result.toString();
    } catch (JSONException ex) {
      throw new IllegalArgumentException("Invalid prompt payload for local LLM engine", ex);
    }
  }

  private JSONArray candidateArray(Object value, double confidence, String evidenceText) {
    JSONObject evidence = new JSONObject();
    put(evidence, "text", evidenceText == null ? "" : evidenceText);

    JSONArray evidenceArray = new JSONArray();
    evidenceArray.put(evidence);

    JSONObject candidate = new JSONObject();
    put(candidate, "value", value);
    put(candidate, "confidence", confidence);
    put(candidate, "evidence", evidenceArray);

    JSONArray candidates = new JSONArray();
    candidates.put(candidate);
    return candidates;
  }

  private static void put(JSONObject target, String key, Object value) {
    try {
      target.put(key, value);
    } catch (JSONException ex) {
      throw new IllegalStateException("Cannot serialize LLM payload key " + key, ex);
    }
  }
}
