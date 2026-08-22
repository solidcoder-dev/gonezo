package com.gonezo.multiplatform.infrastructure.processing.isolation

import android.os.Bundle
import dev.solidcoder.interpretation.application.FieldPromptVariant
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRequest
import dev.solidcoder.interpretation.domain.AllowedValue
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import org.json.JSONArray
import org.json.JSONObject

internal object StructuredGenerationRequestCodec {
  fun encode(request: StructuredGenerationRequest): Bundle = Bundle().apply {
    putString("json", encodeJson(request))
  }

  fun encodeJson(request: StructuredGenerationRequest): String = JSONObject().apply {
    put("prompt", request.prompt)
    request.fieldKey?.let { put("fieldKey", it) }
    request.fieldIndex?.let { put("fieldIndex", it) }
    request.attemptNumber?.let { put("attemptNumber", it) }
    put("promptVariant", request.promptVariant.name)
    request.generationTimeoutMs?.let { put("generationTimeoutMs", it) }
    put("spec", encodeSpec(request.spec))
  }.toString()

  fun decode(bundle: Bundle): StructuredGenerationRequest {
    return decodeJson(requireNotNull(bundle.getString("json")))
  }

  fun decodeJson(raw: String): StructuredGenerationRequest {
    val json = JSONObject(raw)
    val fieldIndex = json.optIntOrNull("fieldIndex")
    val attemptNumber = json.optIntOrNull("attemptNumber")
    val generationTimeoutMs = json.optLongOrNull("generationTimeoutMs")
    return StructuredGenerationRequest(
      prompt = json.getString("prompt"),
      spec = decodeSpec(json.getJSONObject("spec")),
      fieldKey = json.optString("fieldKey").takeIf { it.isNotBlank() },
      fieldIndex = fieldIndex,
      attemptNumber = attemptNumber,
      promptVariant = FieldPromptVariant.valueOf(json.getString("promptVariant")),
      generationTimeoutMs = generationTimeoutMs,
    )
  }

  private fun encodeSpec(spec: InterpretationSpec): JSONObject = JSONObject().apply {
    put("id", spec.id.value)
    put("version", spec.version.value)
    put("fields", JSONArray().apply { spec.fields.forEach { put(encodeField(it)) } })
  }

  private fun encodeField(field: FieldSpec): JSONObject = JSONObject().apply {
    put("key", field.key.value)
    put("description", field.description.value)
    put("type", field.type.name)
    put("required", field.required)
    field.format?.let { put("format", it) }
    put("allowedValues", JSONArray().apply {
      field.allowedValues.forEach { value ->
        put(JSONObject().apply {
          put("stableValue", value.stableValue)
          put("label", value.label)
          value.description?.let { put("description", it) }
        })
      }
    })
  }

  private fun decodeSpec(json: JSONObject): InterpretationSpec = InterpretationSpec(
    id = InterpretationSpecId.of(json.getString("id")),
    version = InterpretationSpecVersion.of(json.getString("version")),
    fields = json.getJSONArray("fields").let { fields ->
      (0 until fields.length()).map { index -> decodeField(fields.getJSONObject(index)) }
    },
  )

  private fun decodeField(json: JSONObject): FieldSpec = FieldSpec(
    key = FieldKey.of(json.getString("key")),
    description = FieldDescription.of(json.getString("description")),
    type = FieldType.valueOf(json.getString("type")),
    required = json.optBoolean("required", false),
    format = json.optString("format").takeIf { it.isNotBlank() },
    allowedValues = json.getJSONArray("allowedValues").let { values ->
      (0 until values.length()).map { index ->
        val value = values.getJSONObject(index)
        AllowedValue(
          stableValue = value.getString("stableValue"),
          label = value.getString("label"),
          description = value.optString("description").takeIf { it.isNotBlank() },
        )
      }
    },
  )

  private fun JSONObject.optIntOrNull(key: String): Int? = if (has(key) && !isNull(key)) getInt(key) else null

  private fun JSONObject.optLongOrNull(key: String): Long? = if (has(key) && !isNull(key)) getLong(key) else null
}
