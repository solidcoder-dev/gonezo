package com.gonezo.multiplatform.audioextraction.domain.schema;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

public record OutputSchema(Map<String, FieldSchema> fields) {
  public OutputSchema {
    if (fields == null) {
      fields = Map.of();
    }
  }

  public static OutputSchema fromJson(JSONObject schemaJson) {
    if (schemaJson == null) {
      return new OutputSchema(Map.of());
    }

    Set<String> requiredFields = new LinkedHashSet<>();
    JSONArray requiredArray = schemaJson.optJSONArray("required");
    if (requiredArray != null) {
      for (int index = 0; index < requiredArray.length(); index++) {
        String name = requiredArray.optString(index, "").trim();
        if (!name.isEmpty()) {
          requiredFields.add(name);
        }
      }
    }

    JSONObject properties = schemaJson.optJSONObject("properties");
    if (properties == null) {
      return new OutputSchema(Map.of());
    }

    Map<String, FieldSchema> parsedFields = new LinkedHashMap<>();
    java.util.Iterator<String> fieldNames = properties.keys();
    while (fieldNames.hasNext()) {
      String fieldName = fieldNames.next();
      JSONObject property = properties.optJSONObject(fieldName);
      if (property == null) {
        continue;
      }

      String type = property.optString("type", "string");
      String format = property.has("format") ? property.optString("format", null) : null;
      JSONArray enumArray = property.optJSONArray("enum");
      java.util.List<String> enumValues = new java.util.ArrayList<>();
      if (enumArray != null) {
        for (int index = 0; index < enumArray.length(); index++) {
          String value = enumArray.optString(index, "").trim();
          if (!value.isEmpty()) {
            enumValues.add(value);
          }
        }
      }

      parsedFields.put(fieldName, new FieldSchema(type, format, enumValues, requiredFields.contains(fieldName)));
    }

    return new OutputSchema(parsedFields);
  }
}
