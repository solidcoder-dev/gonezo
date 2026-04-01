package com.gonezo.multiplatform.audioextraction.contract;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class ContractJsonMapper {
  private ContractJsonMapper() {
  }

  public static Map<String, Object> toMap(JSONObject source) {
    if (source == null) {
      return Map.of();
    }
    Map<String, Object> result = new LinkedHashMap<>();
    java.util.Iterator<String> keys = source.keys();
    while (keys.hasNext()) {
      String key = keys.next();
      result.put(key, fromJsonValue(source.opt(key)));
    }
    return result;
  }

  public static List<Object> toList(JSONArray source) {
    if (source == null) {
      return List.of();
    }
    List<Object> result = new ArrayList<>();
    for (int index = 0; index < source.length(); index++) {
      result.add(fromJsonValue(source.opt(index)));
    }
    return result;
  }

  public static Object fromJsonValue(Object value) {
    if (value == null || JSONObject.NULL.equals(value)) {
      return null;
    }
    if (value instanceof JSONObject object) {
      return toMap(object);
    }
    if (value instanceof JSONArray array) {
      return toList(array);
    }
    return value;
  }

  @SuppressWarnings("unchecked")
  public static JSONObject toJsonObject(Map<String, Object> source) {
    JSONObject result = new JSONObject();
    if (source == null) {
      return result;
    }
    for (Map.Entry<String, Object> entry : source.entrySet()) {
      try {
        result.put(entry.getKey(), toJsonValue(entry.getValue()));
      } catch (JSONException ex) {
        throw new IllegalStateException("Cannot map value to JSON for key " + entry.getKey(), ex);
      }
    }
    return result;
  }

  public static JSONArray toJsonArray(List<?> source) {
    JSONArray result = new JSONArray();
    if (source == null) {
      return result;
    }
    for (Object item : source) {
      result.put(toJsonValue(item));
    }
    return result;
  }

  @SuppressWarnings("unchecked")
  public static Object toJsonValue(Object value) {
    if (value == null) {
      return JSONObject.NULL;
    }
    if (value instanceof Map<?, ?> mapValue) {
      return toJsonObject((Map<String, Object>) mapValue);
    }
    if (value instanceof List<?> listValue) {
      return toJsonArray(listValue);
    }
    return value;
  }
}
