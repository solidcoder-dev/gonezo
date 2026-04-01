package com.gonezo.multiplatform.audioextraction.contract;

import java.util.Map;
import org.json.JSONException;
import org.json.JSONObject;

public record ExtractionRequest(
  String schemaVersion,
  Source source,
  Extraction extraction,
  Map<String, Object> context,
  Options options
) {
  public ExtractionRequest {
    if (context == null) {
      context = Map.of();
    }
  }

  public JSONObject toJson() {
    JSONObject result = new JSONObject();
    put(result, "schemaVersion", schemaVersion);
    put(result, "source", source == null ? JSONObject.NULL : source.toJson());
    put(result, "extraction", extraction == null ? JSONObject.NULL : extraction.toJson());
    put(result, "context", ContractJsonMapper.toJsonObject(context));
    if (options != null) {
      put(result, "options", options.toJson());
    }
    return result;
  }

  public static ExtractionRequest fromJson(JSONObject json) {
    if (json == null) {
      return null;
    }
    Source source = Source.fromJson(json.optJSONObject("source"));
    Extraction extraction = Extraction.fromJson(json.optJSONObject("extraction"));
    Options options = Options.fromJson(json.optJSONObject("options"));
    return new ExtractionRequest(
      json.optString("schemaVersion", null),
      source,
      extraction,
      ContractJsonMapper.toMap(json.optJSONObject("context")),
      options
    );
  }

  public record Source(String type, String value) {
    public JSONObject toJson() {
      JSONObject result = new JSONObject();
      put(result, "type", type);
      put(result, "value", value);
      return result;
    }

    public static Source fromJson(JSONObject json) {
      if (json == null) {
        return null;
      }
      return new Source(json.optString("type", null), json.optString("value", null));
    }
  }

  public record Extraction(Map<String, Object> outputSchema, String instructions) {
    public Extraction {
      if (outputSchema == null) {
        outputSchema = Map.of();
      }
    }

    public JSONObject toJson() {
      JSONObject result = new JSONObject();
      put(result, "outputSchema", ContractJsonMapper.toJsonObject(outputSchema));
      if (instructions != null) {
        put(result, "instructions", instructions);
      }
      return result;
    }

    public static Extraction fromJson(JSONObject json) {
      if (json == null) {
        return null;
      }
      return new Extraction(
        ContractJsonMapper.toMap(json.optJSONObject("outputSchema")),
        json.has("instructions") ? json.optString("instructions", null) : null
      );
    }
  }

  public record Options(Boolean includeTranscript, String language) {
    public JSONObject toJson() {
      JSONObject result = new JSONObject();
      if (includeTranscript != null) {
        put(result, "includeTranscript", includeTranscript);
      }
      if (language != null) {
        put(result, "language", language);
      }
      return result;
    }

    public static Options fromJson(JSONObject json) {
      if (json == null) {
        return null;
      }
      return new Options(
        json.has("includeTranscript") ? json.optBoolean("includeTranscript") : null,
        json.has("language") ? json.optString("language", null) : null
      );
    }
  }

  private static void put(JSONObject target, String key, Object value) {
    try {
      target.put(key, value);
    } catch (JSONException ex) {
      throw new IllegalStateException("Cannot serialize extraction request key " + key, ex);
    }
  }
}
