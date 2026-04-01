package com.gonezo.multiplatform.audioextraction.contract;

import com.gonezo.multiplatform.audioextraction.domain.model.Evidence;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public record ExtractionResult(
  String schemaVersion,
  String outcome,
  Map<String, Object> data,
  Map<String, FieldResult> fieldResults,
  List<String> globalIssues,
  ProcessingInfo processingInfo,
  String transcript
) {
  public ExtractionResult {
    if (data == null) {
      data = Map.of();
    }
    if (fieldResults == null) {
      fieldResults = Map.of();
    }
    if (globalIssues == null) {
      globalIssues = List.of();
    }
  }

  public JSONObject toJson() {
    JSONObject result = new JSONObject();
    put(result, "schemaVersion", schemaVersion);
    put(result, "outcome", outcome);
    put(result, "data", ContractJsonMapper.toJsonObject(data));

    JSONObject jsonFieldResults = new JSONObject();
    for (Map.Entry<String, FieldResult> entry : fieldResults.entrySet()) {
      put(jsonFieldResults, entry.getKey(), entry.getValue().toJson());
    }
    put(result, "fieldResults", jsonFieldResults);
    put(result, "globalIssues", ContractJsonMapper.toJsonArray(globalIssues));
    put(result, "processingInfo", processingInfo == null ? JSONObject.NULL : processingInfo.toJson());
    if (transcript != null) {
      put(result, "transcript", transcript);
    }
    return result;
  }

  public static ExtractionResult fromJson(JSONObject json) {
    if (json == null) {
      return null;
    }

    Map<String, FieldResult> parsedFieldResults = new LinkedHashMap<>();
    JSONObject fieldResultsObject = json.optJSONObject("fieldResults");
    if (fieldResultsObject != null) {
      java.util.Iterator<String> keys = fieldResultsObject.keys();
      while (keys.hasNext()) {
        String key = keys.next();
        parsedFieldResults.put(key, FieldResult.fromJson(fieldResultsObject.optJSONObject(key)));
      }
    }

    List<String> issues = new ArrayList<>();
    JSONArray globalIssuesArray = json.optJSONArray("globalIssues");
    if (globalIssuesArray != null) {
      for (int index = 0; index < globalIssuesArray.length(); index++) {
        String issue = globalIssuesArray.optString(index, "").trim();
        if (!issue.isEmpty()) {
          issues.add(issue);
        }
      }
    }

    return new ExtractionResult(
      json.optString("schemaVersion", null),
      json.optString("outcome", null),
      ContractJsonMapper.toMap(json.optJSONObject("data")),
      parsedFieldResults,
      issues,
      ProcessingInfo.fromJson(json.optJSONObject("processingInfo")),
      json.has("transcript") ? json.optString("transcript", null) : null
    );
  }

  public record FieldResult(Object value, double confidence, List<Evidence> evidence, List<String> issues) {
    public FieldResult {
      if (evidence == null) {
        evidence = List.of();
      }
      if (issues == null) {
        issues = List.of();
      }
    }

    public JSONObject toJson() {
      JSONObject result = new JSONObject();
      put(result, "value", ContractJsonMapper.toJsonValue(value));
      put(result, "confidence", confidence);

      JSONArray evidenceArray = new JSONArray();
      for (Evidence evidenceItem : evidence) {
        JSONObject evidenceJson = new JSONObject();
        put(evidenceJson, "text", evidenceItem.text());
        if (evidenceItem.startMs() > 0) {
          put(evidenceJson, "startMs", evidenceItem.startMs());
        }
        if (evidenceItem.endMs() > 0) {
          put(evidenceJson, "endMs", evidenceItem.endMs());
        }
        evidenceArray.put(evidenceJson);
      }
      put(result, "evidence", evidenceArray);
      put(result, "issues", ContractJsonMapper.toJsonArray(issues));
      return result;
    }

    public static FieldResult fromJson(JSONObject json) {
      if (json == null) {
        return null;
      }

      List<Evidence> evidenceItems = new ArrayList<>();
      JSONArray evidenceArray = json.optJSONArray("evidence");
      if (evidenceArray != null) {
        for (int index = 0; index < evidenceArray.length(); index++) {
          JSONObject evidenceJson = evidenceArray.optJSONObject(index);
          if (evidenceJson == null) {
            continue;
          }
          evidenceItems.add(new Evidence(
            evidenceJson.optString("text", ""),
            evidenceJson.optLong("startMs", 0L),
            evidenceJson.optLong("endMs", 0L)
          ));
        }
      }

      List<String> issueCodes = new ArrayList<>();
      JSONArray issuesArray = json.optJSONArray("issues");
      if (issuesArray != null) {
        for (int index = 0; index < issuesArray.length(); index++) {
          String issue = issuesArray.optString(index, "").trim();
          if (!issue.isEmpty()) {
            issueCodes.add(issue);
          }
        }
      }

      return new FieldResult(
        ContractJsonMapper.fromJsonValue(json.opt("value")),
        json.optDouble("confidence", 0D),
        evidenceItems,
        issueCodes
      );
    }
  }

  public record ProcessingInfo(String requestId, String version, double processingTimeMs, Map<String, Double> stageTimings) {
    public ProcessingInfo {
      if (stageTimings == null) {
        stageTimings = Map.of();
      }
    }

    public JSONObject toJson() {
      JSONObject result = new JSONObject();
      put(result, "requestId", requestId);
      put(result, "version", version);
      put(result, "processingTimeMs", processingTimeMs);
      JSONObject timings = new JSONObject();
      for (Map.Entry<String, Double> entry : stageTimings.entrySet()) {
        put(timings, entry.getKey(), entry.getValue());
      }
      put(result, "stageTimings", timings);
      return result;
    }

    public static ProcessingInfo fromJson(JSONObject json) {
      if (json == null) {
        return null;
      }
      Map<String, Double> timings = new LinkedHashMap<>();
      JSONObject stageTimingsObject = json.optJSONObject("stageTimings");
      if (stageTimingsObject != null) {
        java.util.Iterator<String> keys = stageTimingsObject.keys();
        while (keys.hasNext()) {
          String key = keys.next();
          timings.put(key, stageTimingsObject.optDouble(key, 0D));
        }
      }
      return new ProcessingInfo(
        json.optString("requestId", null),
        json.optString("version", null),
        json.optDouble("processingTimeMs", 0D),
        timings
      );
    }
  }

  private static void put(JSONObject target, String key, Object value) {
    try {
      target.put(key, value);
    } catch (JSONException ex) {
      throw new IllegalStateException("Cannot serialize extraction result key " + key, ex);
    }
  }
}
