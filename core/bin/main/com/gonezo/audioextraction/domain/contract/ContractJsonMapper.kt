package com.gonezo.audioextraction.domain.contract

import org.json.JSONArray
import org.json.JSONObject

object ContractJsonMapper {
  @JvmStatic
  fun toMap(source: JSONObject?): Map<String, Any?> {
    if (source == null) {
      return emptyMap()
    }
    val result = linkedMapOf<String, Any?>()
    val keys = source.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      result[key] = fromJsonValue(source.opt(key))
    }
    return result
  }

  @JvmStatic
  fun toList(source: JSONArray?): List<Any?> {
    if (source == null) {
      return emptyList()
    }
    return buildList(source.length()) {
      for (index in 0 until source.length()) {
        add(fromJsonValue(source.opt(index)))
      }
    }
  }

  @JvmStatic
  fun fromJsonValue(value: Any?): Any? {
    if (value == null || value == JSONObject.NULL) {
      return null
    }
    return when (value) {
      is JSONObject -> toMap(value)
      is JSONArray -> toList(value)
      else -> value
    }
  }

  @Suppress("UNCHECKED_CAST")
  @JvmStatic
  fun toJsonObject(source: Map<String, Any?>?): JSONObject {
    val result = JSONObject()
    if (source == null) {
      return result
    }
    for ((key, value) in source) {
      result.put(key, toJsonValue(value))
    }
    return result
  }

  @JvmStatic
  fun toJsonArray(source: List<*>?): JSONArray {
    val result = JSONArray()
    if (source == null) {
      return result
    }
    for (item in source) {
      result.put(toJsonValue(item))
    }
    return result
  }

  @Suppress("UNCHECKED_CAST")
  @JvmStatic
  fun toJsonValue(value: Any?): Any {
    if (value == null) {
      return JSONObject.NULL
    }
    return when (value) {
      is Map<*, *> -> toJsonObject(value as Map<String, Any?>)
      is List<*> -> toJsonArray(value)
      else -> value
    }
  }
}
