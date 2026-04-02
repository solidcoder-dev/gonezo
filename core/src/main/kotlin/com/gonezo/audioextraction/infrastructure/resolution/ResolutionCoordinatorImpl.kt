package com.gonezo.audioextraction.infrastructure.resolution

import com.gonezo.audioextraction.application.pipeline.ResolutionCoordinator
import com.gonezo.audioextraction.domain.model.ExtractionContext
import com.gonezo.audioextraction.domain.model.FieldCandidate
import com.gonezo.audioextraction.domain.model.ResolvedField
import com.gonezo.audioextraction.domain.schema.FieldSchema
import com.gonezo.audioextraction.domain.schema.OutputSchema

class ResolutionCoordinatorImpl : ResolutionCoordinator {
  private val resolvers: List<FieldResolver> = listOf(
    EnumResolver(),
    DateResolver(),
    NumberResolver(),
    StringResolver(),
  )

  override fun resolve(
    candidates: Map<String, List<FieldCandidate>>,
    schema: OutputSchema,
    context: ExtractionContext,
  ): Map<String, ResolvedField> {
    val resolved = linkedMapOf<String, ResolvedField>()

    for ((fieldName, fieldSchema) in schema.fields) {
      val fieldCandidates = candidates[fieldName] ?: emptyList()
      val field = resolveField(fieldName, fieldSchema, fieldCandidates)
      resolved[fieldName] = normalizeIssues(field)
    }

    return resolved
  }

  private fun resolveField(fieldName: String, schema: FieldSchema, candidates: List<FieldCandidate>): ResolvedField {
    for (resolver in resolvers) {
      if (resolver.supports(schema)) {
        return resolver.resolve(fieldName, schema, candidates)
      }
    }

    return if (schema.required) {
      ResolvedField(null, 0.0, emptyList(), listOf("missing"))
    } else {
      ResolvedField(null, 0.0, emptyList(), emptyList())
    }
  }

  private fun normalizeIssues(field: ResolvedField): ResolvedField {
    if (field.issues.isEmpty()) return field

    val normalizedIssues = field.issues.map { issue ->
      when (issue.trim()) {
        "missing", "ambiguous", "invalid", "invalid_format" -> issue.trim()
        else -> "invalid"
      }
    }

    return field.copy(issues = normalizedIssues)
  }
}
