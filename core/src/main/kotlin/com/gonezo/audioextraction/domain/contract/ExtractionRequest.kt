package com.gonezo.audioextraction.domain.contract

import org.json.JSONObject

data class ExtractionRequest(
  val schemaVersion: String?,
  val source: Source?,
  val extraction: Extraction?,
  val context: Map<String, Any?> = emptyMap(),
  val options: Options? = null,
) {
  fun toJson(): JSONObject {
    val result = JSONObject()
    result.put("schemaVersion", schemaVersion)
    result.put("source", source?.toJson() ?: JSONObject.NULL)
    result.put("extraction", extraction?.toJson() ?: JSONObject.NULL)
    result.put("context", ContractJsonMapper.toJsonObject(context))
    if (options != null) {
      result.put("options", options.toJson())
    }
    return result
  }

  data class Source(
    val type: String?,
    val value: String?,
  ) {
    fun toJson(): JSONObject {
      val result = JSONObject()
      result.put("type", type)
      result.put("value", value)
      return result
    }

    companion object {
      @JvmStatic
      fun fromJson(json: JSONObject?): Source? {
        if (json == null) {
          return null
        }
        return Source(json.optString("type", null), json.optString("value", null))
      }
    }
  }

  data class Extraction(
    val outputSchema: Map<String, Any?> = emptyMap(),
    val instructions: String? = null,
  ) {
    fun toJson(): JSONObject {
      val result = JSONObject()
      result.put("outputSchema", ContractJsonMapper.toJsonObject(outputSchema))
      if (instructions != null) {
        result.put("instructions", instructions)
      }
      return result
    }

    companion object {
      @JvmStatic
      fun fromJson(json: JSONObject?): Extraction? {
        if (json == null) {
          return null
        }
        return Extraction(
          ContractJsonMapper.toMap(json.optJSONObject("outputSchema")),
          if (json.has("instructions")) json.optString("instructions", null) else null,
        )
      }
    }
  }

  data class Options(
    val includeTranscript: Boolean?,
    val language: String?,
  ) {
    fun toJson(): JSONObject {
      val result = JSONObject()
      if (includeTranscript != null) {
        result.put("includeTranscript", includeTranscript)
      }
      if (language != null) {
        result.put("language", language)
      }
      return result
    }

    companion object {
      @JvmStatic
      fun fromJson(json: JSONObject?): Options? {
        if (json == null) {
          return null
        }
        return Options(
          if (json.has("includeTranscript")) json.optBoolean("includeTranscript") else null,
          if (json.has("language")) json.optString("language", null) else null,
        )
      }
    }
  }

  companion object {
    @JvmStatic
    fun fromJson(json: JSONObject?): ExtractionRequest? {
      if (json == null) {
        return null
      }
      return ExtractionRequest(
        json.optString("schemaVersion", null),
        Source.fromJson(json.optJSONObject("source")),
        Extraction.fromJson(json.optJSONObject("extraction")),
        ContractJsonMapper.toMap(json.optJSONObject("context")),
        Options.fromJson(json.optJSONObject("options")),
      )
    }
  }
}
