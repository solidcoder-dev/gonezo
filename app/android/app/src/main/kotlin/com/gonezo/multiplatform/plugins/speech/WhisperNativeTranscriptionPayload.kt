package com.gonezo.multiplatform.plugins.speech

import org.json.JSONArray
import org.json.JSONObject

internal data class WhisperNativeTranscriptionSegmentPayload(
  val text: String,
  val startMs: Long,
  val endMs: Long,
  val noSpeechProbability: Float,
)

internal sealed interface WhisperNativeTranscriptionPayload {
  data class Success(
    val text: String,
    val segments: List<WhisperNativeTranscriptionSegmentPayload>,
  ) : WhisperNativeTranscriptionPayload

  data class Failure(
    val code: String,
    val message: String,
    val recoverable: Boolean,
    val retryable: Boolean,
  ) : WhisperNativeTranscriptionPayload
}

internal fun parseWhisperNativeTranscriptionPayload(json: String): WhisperNativeTranscriptionPayload {
  val root = JSONObject(json)
  root.optJSONObject("error")?.let { error ->
    return WhisperNativeTranscriptionPayload.Failure(
      code = error.getString("code"),
      message = error.getString("message"),
      recoverable = error.optBoolean("recoverable", true),
      retryable = error.optBoolean("retryable", error.optBoolean("recoverable", true)),
    )
  }

  val segmentsObject = root.optJSONObject("segments") ?: JSONObject()
  val texts = segmentsObject.optJSONArray("text") ?: JSONArray()
  val startMs = segmentsObject.optJSONArray("startMs") ?: JSONArray()
  val endMs = segmentsObject.optJSONArray("endMs") ?: JSONArray()
  val noSpeechProbabilities = segmentsObject.optJSONArray("noSpeechProbability") ?: JSONArray()

  val segmentCount = texts.length()
  require(startMs.length() == segmentCount && endMs.length() == segmentCount && noSpeechProbabilities.length() == segmentCount) {
    "Whisper native segment arrays must have the same length"
  }

  val segments = buildList(segmentCount) {
    for (index in 0 until segmentCount) {
      add(
        WhisperNativeTranscriptionSegmentPayload(
          text = texts.getString(index),
          startMs = startMs.getLong(index),
          endMs = endMs.getLong(index),
          noSpeechProbability = noSpeechProbabilities.getDouble(index).toFloat(),
        ),
      )
    }
  }

  return WhisperNativeTranscriptionPayload.Success(
    text = root.optString("text").takeIf { it.isNotBlank() } ?: segments.joinToString(separator = " ") { it.text }.trim(),
    segments = segments,
  )
}
