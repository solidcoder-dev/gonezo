package com.gonezo.audioextraction.application.pipeline

import com.gonezo.audioextraction.domain.contract.ExtractionRequest
import com.gonezo.audioextraction.domain.model.ExecutionPlan
import com.gonezo.audioextraction.domain.schema.OutputSchema

open class ExecutionPlanner {
  open fun plan(request: ExtractionRequest, schema: OutputSchema): ExecutionPlan {
    val required = mutableListOf<String>()
    val optional = mutableListOf<String>()

    for ((fieldName, fieldSchema) in schema.fields) {
      if (fieldSchema.required) {
        required.add(fieldName)
      } else {
        optional.add(fieldName)
      }
    }

    val includeTranscript = request.options?.includeTranscript == true
    return ExecutionPlan(required, optional, includeTranscript)
  }
}
