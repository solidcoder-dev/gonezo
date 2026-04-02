package com.gonezo.audioextraction.domain.contract

import com.gonezo.audioextraction.domain.model.Evidence
import org.json.JSONArray
import org.json.JSONObject

data class ExtractionResult(
  val schemaVersion: String?,
  val outcome: String?,
  val data: Map<String, Any?> = emptyMap(),
  val fieldResults: Map<String, FieldResult> = emptyMap(),
  val globalIssues: List<String> = emptyList(),
  val processingInfo: ProcessingInfo?,
  val transcript: String? = null,
) {
  fun toJson(): JSONObject {
    val result = JSONObject()
    result.put("schemaVersion", schemaVersion)
    result.put("outcome", outcome)
    result.put("data", ContractJsonMapper.toJsonObject(data))

    val jsonFieldResults = JSONObject()
    for ((key, value) in fieldResults) {
      jsonFieldResults.put(key, value.toJson())
    }
    result.put("fieldResults", jsonFieldResults)
    result.put("globalIssues", ContractJsonMapper.toJsonArray(globalIssues))
    result.put("processingInfo", processingInfo?.toJson() ?: JSONObject.NULL)
    if (transcript != null) {
      result.put("transcript", transcript)
    }
    return result
  }

  data class FieldResult(
    val value: Any?,
    val confidence: Double,
    val evidence: List<Evidence> = emptyList(),
    val issues: List<String> = emptyList(),
  ) {
    fun toJson(): JSONObject {
      val result = JSONObject()
      result.put("value", ContractJsonMapper.toJsonValue(value))
      result.put("confidence", confidence)

      val evidenceArray = JSONArray()
      for (evidenceItem in evidence) {
        val evidenceJson = JSONObject()
        evidenceJson.put("text", evidenceItem.text)
        if (evidenceItem.startMs > 0) {
          evidenceJson.put("startMs", evidenceItem.startMs)
        }
        if (evidenceItem.endMs > 0) {
          evidenceJson.put("endMs", evidenceItem.endMs)
        }
        evidenceArray.put(evidenceJson)
      }
      result.put("evidence", evidenceArray)
      result.put("issues", ContractJsonMapper.toJsonArray(issues))
      return result
    }

    companion object {
      @JvmStatic
      fun fromJson(json: JSONObject?): FieldResult? {
        if (json == null) {
          return null
        }

        val evidenceItems = mutableListOf<Evidence>()
        val evidenceArray = json.optJSONArray("evidence")
        if (evidenceArray != null) {
          for (index in 0 until evidenceArray.length()) {
            val evidenceJson = evidenceArray.optJSONObject(index) ?: continue
            evidenceItems.add(
              Evidence(
                evidenceJson.optString("text", ""),
                evidenceJson.optLong("startMs", 0L),
                evidenceJson.optLong("endMs", 0L),
              )
            )
          }
        }

        val issueCodes = mutableListOf<String>()
        val issuesArray = json.optJSONArray("issues")
        if (issuesArray != null) {
          for (index in 0 until issuesArray.length()) {
            val issue = issuesArray.optString(index, "").trim()
            if (issue.isNotEmpty()) {
              issueCodes.add(issue)
            }
          }
        }

        return FieldResult(
          ContractJsonMapper.fromJsonValue(json.opt("value")),
          json.optDouble("confidence", 0.0),
          evidenceItems,
          issueCodes,
        )
      }
    }
  }

  data class ProcessingInfo(
    val requestId: String?,
    val version: String?,
    val processingTimeMs: Double,
    val stageTimings: Map<String, Double> = emptyMap(),
  ) {
    fun toJson(): JSONObject {
      val result = JSONObject()
      result.put("requestId", requestId)
      result.put("version", version)
      result.put("processingTimeMs", processingTimeMs)

      val timings = JSONObject()
      for ((key, value) in stageTimings) {
        timings.put(key, value)
      }
      result.put("stageTimings", timings)
      return result
    }

    companion object {
      @JvmStatic
      fun fromJson(json: JSONObject?): ProcessingInfo? {
        if (json == null) {
          return null
        }

        val timings = linkedMapOf<String, Double>()
        val stageTimingsObject = json.optJSONObject("stageTimings")
        if (stageTimingsObject != null) {
          val keys = stageTimingsObject.keys()
          while (keys.hasNext()) {
            val key = keys.next()
            timings[key] = stageTimingsObject.optDouble(key, 0.0)
          }
        }

        return ProcessingInfo(
          json.optString("requestId", null),
          json.optString("version", null),
          json.optDouble("processingTimeMs", 0.0),
          timings,
        )
      }
    }
  }

  companion object {
    @JvmStatic
    fun fromJson(json: JSONObject?): ExtractionResult? {
      if (json == null) {
        return null
      }

      val parsedFieldResults = linkedMapOf<String, FieldResult>()
      val fieldResultsObject = json.optJSONObject("fieldResults")
      if (fieldResultsObject != null) {
        val keys = fieldResultsObject.keys()
        while (keys.hasNext()) {
          val key = keys.next()
          FieldResult.fromJson(fieldResultsObject.optJSONObject(key))?.let { parsedFieldResults[key] = it }
        }
      }

      val issues = mutableListOf<String>()
      val globalIssuesArray = json.optJSONArray("globalIssues")
      if (globalIssuesArray != null) {
        for (index in 0 until globalIssuesArray.length()) {
          val issue = globalIssuesArray.optString(index, "").trim()
          if (issue.isNotEmpty()) {
            issues.add(issue)
          }
        }
      }

      return ExtractionResult(
        json.optString("schemaVersion", null),
        json.optString("outcome", null),
        ContractJsonMapper.toMap(json.optJSONObject("data")),
        parsedFieldResults,
        issues,
        ProcessingInfo.fromJson(json.optJSONObject("processingInfo")),
        if (json.has("transcript")) json.optString("transcript", null) else null,
      )
    }
  }
}
