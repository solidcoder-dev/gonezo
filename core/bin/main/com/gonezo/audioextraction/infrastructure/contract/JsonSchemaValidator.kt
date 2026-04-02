package com.gonezo.audioextraction.infrastructure.contract

import org.json.JSONArray
import org.json.JSONObject

class JsonSchemaValidator {
  fun validate(instance: JSONObject, schema: JSONObject): List<String> {
    val errors = mutableListOf<String>()
    validateValue(instance, schema, "$", errors)
    return errors
  }

  private fun validateValue(value: Any?, schema: JSONObject?, path: String, errors: MutableList<String>) {
    if (schema == null || schema.length() == 0) return

    validateEnum(value, schema, path, errors)
    val type = if (schema.has("type")) schema.optString("type", null) else null

    if (type != null) {
      when (type) {
        "object" -> validateObject(value, schema, path, errors)
        "array" -> validateArray(value, schema, path, errors)
        "string" -> validateString(value, path, errors)
        "number" -> validateNumber(value, schema, path, errors)
        "boolean" -> validateBoolean(value, path, errors)
      }
    } else {
      if (value is JSONObject && schema.has("properties")) validateObject(value, schema, path, errors)
      if (value is JSONArray && schema.has("items")) validateArray(value, schema, path, errors)
    }
  }

  private fun validateObject(value: Any?, schema: JSONObject, path: String, errors: MutableList<String>) {
    if (value !is JSONObject) {
      errors.add("$path must be an object")
      return
    }

    val required = mutableSetOf<String>()
    val requiredArray = schema.optJSONArray("required")
    if (requiredArray != null) {
      for (index in 0 until requiredArray.length()) {
        val key = requiredArray.optString(index, "")
        if (key.isNotEmpty()) required.add(key)
      }
    }

    for (key in required) {
      if (!value.has(key)) errors.add("$path.$key is required")
    }

    val properties = schema.optJSONObject("properties")
    val additionalProperties: Any = if (schema.has("additionalProperties")) schema.opt("additionalProperties") else true

    val keys = value.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      val childValue = value.opt(key)
      if (properties != null && properties.has(key)) {
        properties.optJSONObject(key)?.let { validateValue(childValue, it, "$path.$key", errors) }
        continue
      }

      when (additionalProperties) {
        is Boolean -> if (!additionalProperties) errors.add("$path.$key is not allowed")
        is JSONObject -> validateValue(childValue, additionalProperties, "$path.$key", errors)
      }
    }
  }

  private fun validateArray(value: Any?, schema: JSONObject, path: String, errors: MutableList<String>) {
    if (value !is JSONArray) {
      errors.add("$path must be an array")
      return
    }
    val itemSchema = schema.optJSONObject("items") ?: return
    for (index in 0 until value.length()) {
      validateValue(value.opt(index), itemSchema, "$path[$index]", errors)
    }
  }

  private fun validateString(value: Any?, path: String, errors: MutableList<String>) {
    if (value !is String) errors.add("$path must be a string")
  }

  private fun validateNumber(value: Any?, schema: JSONObject, path: String, errors: MutableList<String>) {
    if (value !is Number) {
      errors.add("$path must be a number")
      return
    }

    val numericValue = value.toDouble()
    if (schema.has("minimum")) {
      val minimum = schema.optDouble("minimum", Double.NEGATIVE_INFINITY)
      if (numericValue < minimum) errors.add("$path must be >= $minimum")
    }
    if (schema.has("maximum")) {
      val maximum = schema.optDouble("maximum", Double.POSITIVE_INFINITY)
      if (numericValue > maximum) errors.add("$path must be <= $maximum")
    }
  }

  private fun validateBoolean(value: Any?, path: String, errors: MutableList<String>) {
    if (value !is Boolean) errors.add("$path must be a boolean")
  }

  private fun validateEnum(value: Any?, schema: JSONObject, path: String, errors: MutableList<String>) {
    val enumValues = schema.optJSONArray("enum") ?: return
    if (enumValues.length() == 0) return

    for (index in 0 until enumValues.length()) {
      val enumValue = enumValues.opt(index)
      if (enumValue == null && value == null) return
      if (enumValue != null && enumValue == value) return
    }

    errors.add("$path must be one of enum values")
  }
}
