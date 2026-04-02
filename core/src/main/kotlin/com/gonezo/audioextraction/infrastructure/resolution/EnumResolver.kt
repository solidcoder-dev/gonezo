package com.gonezo.audioextraction.infrastructure.resolution

import com.gonezo.audioextraction.domain.model.FieldCandidate
import com.gonezo.audioextraction.domain.model.ResolvedField
import com.gonezo.audioextraction.domain.schema.FieldSchema

class EnumResolver : FieldResolver {
  override fun supports(schema: FieldSchema): Boolean = schema.enumValues.isNotEmpty()

  override fun resolve(fieldName: String, schema: FieldSchema, candidates: List<FieldCandidate>): ResolvedField {
    val candidate = ResolverSupport.bestCandidate(candidates)
    if (candidate == null || candidate.rawValue == null) {
      val issues = if (schema.required) listOf("missing") else emptyList()
      return ResolvedField(null, 0.0, emptyList(), issues)
    }

    val raw = candidate.rawValue.toString().trim()
    if (raw.isEmpty()) {
      val issues = if (schema.required) listOf("missing") else listOf("invalid")
      return ResolvedField(null, 0.0, candidate.evidence, issues)
    }

    val matched = schema.enumValues.firstOrNull { it.equals(raw, ignoreCase = true) }
      ?: return ResolvedField(null, 0.0, candidate.evidence, listOf("invalid"))

    return ResolvedField(matched, ResolverSupport.clamp(candidate.confidence), candidate.evidence, emptyList())
  }
}
