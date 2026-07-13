package dev.solidcoder.interpretation.domain

import kotlin.ConsistentCopyVisibility

data class FieldResult(
  val key: FieldKey,
  val interpretation: FieldInterpretation,
)

@ConsistentCopyVisibility
data class InterpretationResult private constructor(
  val specId: InterpretationSpecId,
  val specVersion: InterpretationSpecVersion,
  val fields: List<FieldResult>,
  val issues: List<InterpretationIssue> = emptyList(),
) {
  companion object {
    fun fromDecoded(
      specId: InterpretationSpecId,
      specVersion: InterpretationSpecVersion,
      fields: List<FieldResult>,
      issues: List<InterpretationIssue> = emptyList(),
    ): InterpretationResult = InterpretationResult(
      specId = specId,
      specVersion = specVersion,
      fields = fields,
      issues = issues,
    )

    fun forSpec(
      spec: InterpretationSpec,
      candidates: Map<String, FieldCandidate>,
      issues: List<InterpretationIssue> = emptyList(),
    ): InterpretationResult {
      val unknownKeys = candidates.keys.filterNot { candidateKey ->
        spec.fields.any { it.key.value == candidateKey }
      }
      require(unknownKeys.isEmpty()) { "interpretation result contains unknown field keys: ${unknownKeys.joinToString()}" }

      val fields = spec.fields.map { field ->
        val candidate = candidates[field.key.value]
        if (candidate == null) {
          FieldResult(field.key, FieldInterpretation.Missing)
        } else {
          validateCandidate(field, candidate)
          FieldResult(field.key, FieldInterpretation.Resolved(candidate))
        }
      }

      return forSpec(spec, fields, issues)
    }

    fun forSpec(
      spec: InterpretationSpec,
      fields: List<FieldResult>,
      issues: List<InterpretationIssue> = emptyList(),
    ): InterpretationResult {
      val fieldKeys = fields.map { it.key }
      require(fieldKeys.distinct().size == fieldKeys.size) { "interpretation result field keys must be unique" }
      require(fieldKeys.size == spec.fields.size) {
        "interpretation result must contain exactly one entry for every requested field"
      }

      val expectedKeys = spec.fields.map { it.key }.toSet()
      require(fieldKeys.toSet() == expectedKeys) {
        "interpretation result must contain all and only requested field keys"
      }

      val fieldSpecsByKey = spec.fields.associateBy { it.key }
      fields.forEach { field ->
        val fieldSpec = requireNotNull(fieldSpecsByKey[field.key]) {
          "unknown field key ${field.key}"
        }
        validateCompatibility(fieldSpec, field.interpretation)
      }

      issues.forEach { issue ->
        issue.fieldKey?.let { key ->
          require(expectedKeys.contains(key)) { "issue field key must belong to the interpretation spec" }
        }
      }

      return fromDecoded(spec.id, spec.version, fields, issues)
    }

    private fun validateCompatibility(
      fieldSpec: FieldSpec,
      interpretation: FieldInterpretation,
    ) {
      when (interpretation) {
        is FieldInterpretation.Resolved -> validateCandidate(fieldSpec, interpretation.candidate)
        is FieldInterpretation.Ambiguous -> interpretation.candidates.forEach { validateCandidate(fieldSpec, it) }
        FieldInterpretation.Missing -> Unit
      }
    }

    private fun validateCandidate(fieldSpec: FieldSpec, candidate: FieldCandidate) {
      val value = candidate.value
      require(isCompatible(fieldSpec.type, value)) {
        "candidate value for ${fieldSpec.key} is incompatible with ${fieldSpec.type}"
      }

      if (fieldSpec.type == FieldType.ENUM) {
        val stableValue = (value as StructuredValue.Enum).stableValue
        require(fieldSpec.allows(stableValue)) {
          "enum candidate for ${fieldSpec.key} must match one of the allowed values"
        }
      }
    }

    private fun isCompatible(fieldType: FieldType, value: StructuredValue): Boolean = when (fieldType) {
      FieldType.TEXT -> value is StructuredValue.Text
      FieldType.DECIMAL -> value is StructuredValue.Decimal
      FieldType.DATE -> value is StructuredValue.Date
      FieldType.ENUM -> value is StructuredValue.Enum
      FieldType.BOOLEAN -> value is StructuredValue.BooleanValue
      FieldType.INTEGER -> value is StructuredValue.Integer
    }
  }
}
