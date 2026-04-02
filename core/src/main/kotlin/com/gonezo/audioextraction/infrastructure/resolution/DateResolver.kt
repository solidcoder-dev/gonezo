package com.gonezo.audioextraction.infrastructure.resolution

import com.gonezo.audioextraction.domain.model.FieldCandidate
import com.gonezo.audioextraction.domain.model.ResolvedField
import com.gonezo.audioextraction.domain.schema.FieldSchema
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

class DateResolver : FieldResolver {
  override fun supports(schema: FieldSchema): Boolean = schema.type == "string" && schema.format == "date-time"

  override fun resolve(fieldName: String, schema: FieldSchema, candidates: List<FieldCandidate>): ResolvedField {
    val candidate = ResolverSupport.bestCandidate(candidates)
    if (candidate == null || candidate.rawValue == null) {
      val issues = if (schema.required) listOf("missing") else emptyList()
      return ResolvedField(null, 0.0, emptyList(), issues)
    }

    val raw = candidate.rawValue.toString().trim()
    if (raw.isEmpty()) return ResolvedField(null, 0.0, candidate.evidence, listOf("invalid_format"))

    val normalized = parseDateTime(raw)
      ?: return ResolvedField(null, 0.0, candidate.evidence, listOf("invalid_format"))

    return ResolvedField(normalized, ResolverSupport.clamp(candidate.confidence), candidate.evidence, emptyList())
  }

  private fun parseDateTime(value: String): String? {
    return runCatching { Instant.parse(value).toString() }
      .recoverCatching { LocalDate.parse(value).atStartOfDay().toInstant(ZoneOffset.UTC).toString() }
      .getOrNull()
  }
}
