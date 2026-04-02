package com.gonezo.audioextraction.infrastructure.resolution

import com.gonezo.audioextraction.domain.model.FieldCandidate
import com.gonezo.audioextraction.domain.model.ResolvedField
import com.gonezo.audioextraction.domain.schema.FieldSchema

class StringResolver : FieldResolver {
  override fun supports(schema: FieldSchema): Boolean {
    return schema.type == "string" && schema.enumValues.isEmpty() && schema.format.isNullOrBlank()
  }

  override fun resolve(fieldName: String, schema: FieldSchema, candidates: List<FieldCandidate>): ResolvedField {
    val candidate = ResolverSupport.bestCandidate(candidates)
    if (candidate == null || candidate.rawValue == null) {
      val issues = if (schema.required) listOf("missing") else emptyList()
      return ResolvedField(null, 0.0, emptyList(), issues)
    }

    val value = candidate.rawValue.toString().trim()
    if (value.isEmpty()) {
      val issues = if (schema.required) listOf("missing") else listOf("invalid")
      return ResolvedField(null, 0.0, candidate.evidence, issues)
    }

    return ResolvedField(value, ResolverSupport.clamp(candidate.confidence), candidate.evidence, emptyList())
  }
}
