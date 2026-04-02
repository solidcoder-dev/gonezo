package com.gonezo.audioextraction.infrastructure.resolution

import com.gonezo.audioextraction.domain.model.FieldCandidate
import com.gonezo.audioextraction.domain.model.ResolvedField
import com.gonezo.audioextraction.domain.schema.FieldSchema
import java.math.BigDecimal

class NumberResolver : FieldResolver {
  override fun supports(schema: FieldSchema): Boolean = schema.type == "number" || schema.type == "integer"

  override fun resolve(fieldName: String, schema: FieldSchema, candidates: List<FieldCandidate>): ResolvedField {
    val candidate = ResolverSupport.bestCandidate(candidates)
    val rawValue = candidate?.rawValue
    if (candidate == null || rawValue == null) {
      val issues = if (schema.required) listOf("missing") else emptyList()
      return ResolvedField(null, 0.0, emptyList(), issues)
    }

    val parsedNumber = parse(rawValue)
    if (parsedNumber == null) {
      return ResolvedField(null, 0.0, candidate.evidence, listOf("invalid_format"))
    }

    val value: Any = if (schema.type == "integer") parsedNumber.toLong() else parsedNumber.toDouble()
    return ResolvedField(value, ResolverSupport.clamp(candidate.confidence), candidate.evidence, emptyList())
  }

  private fun parse(rawValue: Any): BigDecimal? {
    return when (rawValue) {
      is Number -> BigDecimal(rawValue.toString())
      is String -> rawValue.trim().replace(" ", "").replace(",", ".").takeIf { it.isNotEmpty() }?.toBigDecimalOrNull()
      else -> null
    }
  }
}
