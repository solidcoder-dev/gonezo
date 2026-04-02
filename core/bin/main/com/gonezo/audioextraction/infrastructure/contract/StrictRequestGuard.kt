package com.gonezo.audioextraction.infrastructure.contract

import com.gonezo.audioextraction.application.pipeline.RequestGuard
import com.gonezo.audioextraction.domain.contract.ExtractionRequest
import com.gonezo.audioextraction.domain.contract.ExtractionResult
import com.gonezo.audioextraction.domain.error.AudioExtractionException
import com.gonezo.audioextraction.domain.error.ErrorCode
import org.json.JSONObject

class StrictRequestGuard(
  private val validator: JsonSchemaValidator = JsonSchemaValidator(),
) : RequestGuard {

  override fun validateRequest(request: ExtractionRequest) {
    val errors = validator.validate(request.toJson(), REQUEST_SCHEMA)
    if (errors.isNotEmpty()) {
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Invalid request: ${errors.joinToString("; ")}")
    }
  }

  override fun validateResult(result: ExtractionResult) {
    val errors = validator.validate(result.toJson(), RESULT_SCHEMA).toMutableList()

    val allowedIssues = setOf("missing", "ambiguous", "invalid", "invalid_format")
    for ((fieldName, fieldResult) in result.fieldResults) {
      for (issue in fieldResult.issues) {
        if (issue !in allowedIssues) {
          errors.add("$.fieldResults.$fieldName.issues contains invalid code: $issue")
        }
      }
    }

    if (errors.isNotEmpty()) {
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Invalid result: ${errors.joinToString("; ")}")
    }
  }

  private companion object {
    val REQUEST_SCHEMA: JSONObject = JSONObject(
      """
      {
        "${'$'}schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": ["schemaVersion", "source", "extraction"],
        "properties": {
          "schemaVersion": { "type": "string", "enum": ["v1"] },
          "source": {
            "type": "object",
            "required": ["type", "value"],
            "properties": {
              "type": { "enum": ["base64", "url", "fileRef"] },
              "value": { "type": "string" }
            },
            "additionalProperties": false
          },
          "extraction": {
            "type": "object",
            "required": ["outputSchema"],
            "properties": {
              "outputSchema": { "type": "object" },
              "instructions": { "type": "string" }
            },
            "additionalProperties": false
          },
          "context": { "type": "object", "additionalProperties": true },
          "options": {
            "type": "object",
            "properties": {
              "includeTranscript": { "type": "boolean" },
              "language": { "type": "string" }
            },
            "additionalProperties": false
          }
        },
        "additionalProperties": false
      }
      """.trimIndent(),
    )

    val RESULT_SCHEMA: JSONObject = JSONObject(
      """
      {
        "type": "object",
        "required": [
          "schemaVersion",
          "outcome",
          "data",
          "fieldResults",
          "globalIssues",
          "processingInfo"
        ],
        "properties": {
          "schemaVersion": { "type": "string", "enum": ["v1"] },
          "outcome": { "type": "string", "enum": ["complete", "partial", "failed"] },
          "data": {},
          "fieldResults": {
            "type": "object",
            "additionalProperties": {
              "type": "object",
              "required": ["value", "confidence", "evidence", "issues"],
              "properties": {
                "value": {},
                "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
                "evidence": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": ["text"],
                    "properties": {
                      "text": { "type": "string" },
                      "startMs": { "type": "number" },
                      "endMs": { "type": "number" }
                    }
                  }
                },
                "issues": {
                  "type": "array",
                  "items": { "type": "string" }
                }
              }
            }
          },
          "globalIssues": {
            "type": "array",
            "items": { "type": "string" }
          },
          "processingInfo": {
            "type": "object",
            "required": ["requestId", "version", "processingTimeMs"],
            "properties": {
              "requestId": { "type": "string" },
              "version": { "type": "string" },
              "processingTimeMs": { "type": "number" },
              "stageTimings": {
                "type": "object",
                "additionalProperties": { "type": "number" }
              }
            }
          },
          "transcript": { "type": "string" }
        },
        "additionalProperties": false
      }
      """.trimIndent(),
    )
  }
}
