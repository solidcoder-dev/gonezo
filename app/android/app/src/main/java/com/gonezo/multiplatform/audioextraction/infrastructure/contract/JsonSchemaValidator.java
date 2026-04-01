package com.gonezo.multiplatform.audioextraction.infrastructure.contract;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

public final class JsonSchemaValidator {
  public List<String> validate(JSONObject instance, JSONObject schema) {
    List<String> errors = new ArrayList<>();
    validateValue(instance, schema, "$", errors);
    return errors;
  }

  private void validateValue(Object value, JSONObject schema, String path, List<String> errors) {
    if (schema == null || schema.length() == 0) {
      return;
    }

    validateEnum(value, schema, path, errors);

    String type = schema.has("type") ? schema.optString("type", null) : null;
    if (type != null) {
      switch (type) {
        case "object" -> validateObject(value, schema, path, errors);
        case "array" -> validateArray(value, schema, path, errors);
        case "string" -> validateString(value, path, errors);
        case "number" -> validateNumber(value, schema, path, errors);
        case "boolean" -> validateBoolean(value, path, errors);
        default -> {
          // Unsupported types are ignored in v1.
        }
      }
    } else {
      if (value instanceof JSONObject objectValue && schema.has("properties")) {
        validateObject(objectValue, schema, path, errors);
      }
      if (value instanceof JSONArray arrayValue && schema.has("items")) {
        validateArray(arrayValue, schema, path, errors);
      }
    }
  }

  private void validateObject(Object value, JSONObject schema, String path, List<String> errors) {
    if (!(value instanceof JSONObject objectValue)) {
      errors.add(path + " must be an object");
      return;
    }

    Set<String> required = new HashSet<>();
    JSONArray requiredArray = schema.optJSONArray("required");
    if (requiredArray != null) {
      for (int index = 0; index < requiredArray.length(); index++) {
        String key = requiredArray.optString(index, "");
        if (!key.isEmpty()) {
          required.add(key);
        }
      }
    }

    for (String key : required) {
      if (!objectValue.has(key)) {
        errors.add(path + "." + key + " is required");
      }
    }

    JSONObject properties = schema.optJSONObject("properties");
    Object additionalProperties = schema.has("additionalProperties")
      ? schema.opt("additionalProperties")
      : Boolean.TRUE;

    java.util.Iterator<String> keys = objectValue.keys();
    while (keys.hasNext()) {
      String key = keys.next();
      Object childValue = objectValue.opt(key);
      if (properties != null && properties.has(key)) {
        JSONObject propertySchema = properties.optJSONObject(key);
        if (propertySchema != null) {
          validateValue(childValue, propertySchema, path + "." + key, errors);
        }
        continue;
      }

      if (additionalProperties instanceof Boolean boolAdditionalProperties) {
        if (!boolAdditionalProperties) {
          errors.add(path + "." + key + " is not allowed");
        }
        continue;
      }

      if (additionalProperties instanceof JSONObject objectAdditionalProperties) {
        validateValue(childValue, objectAdditionalProperties, path + "." + key, errors);
      }
    }
  }

  private void validateArray(Object value, JSONObject schema, String path, List<String> errors) {
    if (!(value instanceof JSONArray arrayValue)) {
      errors.add(path + " must be an array");
      return;
    }

    JSONObject itemSchema = schema.optJSONObject("items");
    if (itemSchema == null) {
      return;
    }

    for (int index = 0; index < arrayValue.length(); index++) {
      validateValue(arrayValue.opt(index), itemSchema, path + "[" + index + "]", errors);
    }
  }

  private void validateString(Object value, String path, List<String> errors) {
    if (!(value instanceof String)) {
      errors.add(path + " must be a string");
    }
  }

  private void validateNumber(Object value, JSONObject schema, String path, List<String> errors) {
    if (!(value instanceof Number numberValue)) {
      errors.add(path + " must be a number");
      return;
    }

    double numericValue = numberValue.doubleValue();
    if (schema.has("minimum")) {
      double minimum = schema.optDouble("minimum", Double.NEGATIVE_INFINITY);
      if (numericValue < minimum) {
        errors.add(path + " must be >= " + minimum);
      }
    }
    if (schema.has("maximum")) {
      double maximum = schema.optDouble("maximum", Double.POSITIVE_INFINITY);
      if (numericValue > maximum) {
        errors.add(path + " must be <= " + maximum);
      }
    }
  }

  private void validateBoolean(Object value, String path, List<String> errors) {
    if (!(value instanceof Boolean)) {
      errors.add(path + " must be a boolean");
    }
  }

  private void validateEnum(Object value, JSONObject schema, String path, List<String> errors) {
    JSONArray enumValues = schema.optJSONArray("enum");
    if (enumValues == null || enumValues.length() == 0) {
      return;
    }

    for (int index = 0; index < enumValues.length(); index++) {
      Object enumValue = enumValues.opt(index);
      if (enumValue == null && value == null) {
        return;
      }
      if (enumValue != null && enumValue.equals(value)) {
        return;
      }
    }

    errors.add(path + " must be one of enum values");
  }
}
