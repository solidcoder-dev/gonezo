package com.gonezo.audioextraction.domain.schema

import org.json.JSONObject

data class OutputSchema(
  val fields: Map<String, FieldSchema> = emptyMap(),
) {
  companion object {
    @JvmStatic
    fun fromJson(schemaJson: JSONObject?): OutputSchema {
      if (schemaJson == null) {
        return OutputSchema()
      }

      val requiredFields = linkedSetOf<String>()
      val requiredArray = schemaJson.optJSONArray("required")
      if (requiredArray != null) {
        for (index in 0 until requiredArray.length()) {
          val name = requiredArray.optString(index, "").trim()
          if (name.isNotEmpty()) {
            requiredFields.add(name)
          }
        }
      }

      val properties = schemaJson.optJSONObject("properties") ?: return OutputSchema()

      val parsedFields = linkedMapOf<String, FieldSchema>()
      val fieldNames = properties.keys()
      while (fieldNames.hasNext()) {
        val fieldName = fieldNames.next()
        val property = properties.optJSONObject(fieldName) ?: continue

        val type = property.optString("type", "string")
        val format = if (property.has("format")) property.optString("format", null) else null
        val enumArray = property.optJSONArray("enum")
        val enumValues = mutableListOf<String>()
        if (enumArray != null) {
          for (index in 0 until enumArray.length()) {
            val value = enumArray.optString(index, "").trim()
            if (value.isNotEmpty()) {
              enumValues.add(value)
            }
          }
        }

        parsedFields[fieldName] = FieldSchema(type, format, enumValues, requiredFields.contains(fieldName))
      }

      return OutputSchema(parsedFields)
    }
  }
}
