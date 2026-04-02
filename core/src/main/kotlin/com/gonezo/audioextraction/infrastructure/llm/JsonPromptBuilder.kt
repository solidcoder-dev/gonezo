package com.gonezo.audioextraction.infrastructure.llm

import com.gonezo.audioextraction.domain.model.ExecutionPlan
import com.gonezo.audioextraction.domain.model.Transcript
import com.gonezo.audioextraction.domain.schema.OutputSchema
import org.json.JSONArray
import org.json.JSONObject

class JsonPromptBuilder : PromptBuilder {
  override fun build(transcript: Transcript, schema: OutputSchema, plan: ExecutionPlan): String {
    val prompt = JSONObject()
    prompt.put("task", "Extract field candidates as strict JSON")
    prompt.put("transcript", transcript.text)

    val fields = JSONObject()
    for ((fieldName, fieldSchema) in schema.fields) {
      val field = JSONObject()
      field.put("type", fieldSchema.type)
      if (fieldSchema.format != null) {
        field.put("format", fieldSchema.format)
      }
      if (fieldSchema.enumValues.isNotEmpty()) {
        field.put("enum", JSONArray(fieldSchema.enumValues))
      }
      field.put("required", fieldSchema.required)
      fields.put(fieldName, field)
    }
    prompt.put("fields", fields)
    prompt.put("requiredFields", JSONArray(plan.requiredFields))
    prompt.put("optionalFields", JSONArray(plan.optionalFields))

    prompt.put(
      "outputFormat",
      "{\"fieldCandidates\": {\"<field>\": [{\"value\": <any>, \"confidence\": <0..1>, \"evidence\": [{\"text\": \"...\", \"startMs\": 0, \"endMs\": 0}]}]}}",
    )

    return prompt.toString()
  }
}
