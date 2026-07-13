package com.gonezo.application.orchestration.interpretation

import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.InterpretationResult
import dev.solidcoder.interpretation.domain.StructuredValue
import java.math.BigDecimal
import java.time.LocalDate

class InterpretationResultToMovementEntryDraftMapper(
  private val expectedSpecId: String = "movement-entry",
  private val expectedSpecVersion: String = "v1",
  private val minimumConfidence: Double = 0.5,
) {
  init {
    require(minimumConfidence in 0.0..1.0) { "minimum confidence must be between zero and one" }
  }

  fun map(result: InterpretationResult): MovementEntryDraft {
    require(result.specId.value == expectedSpecId) { "interpretation result spec id does not match the movement draft schema" }
    require(result.specVersion.value == expectedSpecVersion) { "interpretation result spec version does not match the movement draft schema" }

    val issues = mutableListOf<MovementEntryDraftIssue>()

    val type = mapType(result, issues)
    val amount = mapDecimal(result, "amount", MovementEntryDraftField.AMOUNT, issues)
    val occurredOn = mapDate(result, "occurredOn", MovementEntryDraftField.OCCURRED_ON, issues)
    val note = mapText(result, "note", MovementEntryDraftField.NOTE, issues)
    val categoryId = mapCategory(result, issues)

    result.issues.forEach { issue ->
      issues += MovementEntryDraftIssue(
        field = issue.fieldKey?.let(::fieldFromKey),
        code = MovementEntryDraftIssueCode.OUTPUT_INCOMPATIBLE,
      )
    }

    return MovementEntryDraft(
      type = type,
      amount = amount,
      occurredOn = occurredOn,
      note = note,
      categoryId = categoryId,
      issues = issues,
    )
  }

  private fun mapType(result: InterpretationResult, issues: MutableList<MovementEntryDraftIssue>): MovementEntryDraftType? {
    val interpretation = interpretationFor(result, "type")
    return when (interpretation) {
      FieldInterpretation.Missing -> {
        issues += issue(MovementEntryDraftField.TYPE, MovementEntryDraftIssueCode.FIELD_MISSING)
        null
      }
      is FieldInterpretation.Ambiguous -> {
        issues += issue(MovementEntryDraftField.TYPE, MovementEntryDraftIssueCode.FIELD_AMBIGUOUS)
        null
      }
      is FieldInterpretation.Resolved -> {
        val candidate = interpretation.candidate
        if (candidate.confidence.value < minimumConfidence) {
          issues += issue(MovementEntryDraftField.TYPE, MovementEntryDraftIssueCode.CONFIDENCE_INSUFFICIENT)
          return null
        }
        val enumValue = candidate.value as? StructuredValue.Enum
          ?: throw IllegalArgumentException("type must be encoded as an enum")
        when (enumValue.stableValue) {
          "expense" -> MovementEntryDraftType.EXPENSE
          "income" -> MovementEntryDraftType.INCOME
          else -> throw IllegalArgumentException("type must be expense or income")
        }
      }
    }
  }

  private fun mapDecimal(
    result: InterpretationResult,
    key: String,
    field: MovementEntryDraftField,
    issues: MutableList<MovementEntryDraftIssue>,
  ): BigDecimal? {
    val interpretation = interpretationFor(result, key)
    return when (interpretation) {
      FieldInterpretation.Missing -> {
        issues += issue(field, MovementEntryDraftIssueCode.FIELD_MISSING)
        null
      }
      is FieldInterpretation.Ambiguous -> {
        issues += issue(field, MovementEntryDraftIssueCode.FIELD_AMBIGUOUS)
        null
      }
      is FieldInterpretation.Resolved -> {
        val candidate = interpretation.candidate
        if (candidate.confidence.value < minimumConfidence) {
          issues += issue(field, MovementEntryDraftIssueCode.CONFIDENCE_INSUFFICIENT)
          return null
        }
        val value = candidate.value as? StructuredValue.Decimal
          ?: throw IllegalArgumentException("$key must be encoded as a decimal")
        if (value.value <= BigDecimal.ZERO) {
          throw IllegalArgumentException("amount must be greater than zero")
        }
        value.value
      }
    }
  }

  private fun mapDate(
    result: InterpretationResult,
    key: String,
    field: MovementEntryDraftField,
    issues: MutableList<MovementEntryDraftIssue>,
  ): LocalDate? {
    val interpretation = interpretationFor(result, key)
    return when (interpretation) {
      FieldInterpretation.Missing -> {
        issues += issue(field, MovementEntryDraftIssueCode.FIELD_MISSING)
        null
      }
      is FieldInterpretation.Ambiguous -> {
        issues += issue(field, MovementEntryDraftIssueCode.FIELD_AMBIGUOUS)
        null
      }
      is FieldInterpretation.Resolved -> {
        val candidate = interpretation.candidate
        if (candidate.confidence.value < minimumConfidence) {
          issues += issue(field, MovementEntryDraftIssueCode.CONFIDENCE_INSUFFICIENT)
          return null
        }
        val value = candidate.value as? StructuredValue.Date
          ?: throw IllegalArgumentException("$key must be encoded as a date")
        value.value
      }
    }
  }

  private fun mapText(
    result: InterpretationResult,
    key: String,
    field: MovementEntryDraftField,
    issues: MutableList<MovementEntryDraftIssue>,
  ): String? {
    val interpretation = interpretationFor(result, key)
    return when (interpretation) {
      FieldInterpretation.Missing -> {
        issues += issue(field, MovementEntryDraftIssueCode.FIELD_MISSING)
        null
      }
      is FieldInterpretation.Ambiguous -> {
        issues += issue(field, MovementEntryDraftIssueCode.FIELD_AMBIGUOUS)
        null
      }
      is FieldInterpretation.Resolved -> {
        val candidate = interpretation.candidate
        if (candidate.confidence.value < minimumConfidence) {
          issues += issue(field, MovementEntryDraftIssueCode.CONFIDENCE_INSUFFICIENT)
          return null
        }
        val value = when (val structuredValue = candidate.value) {
          is StructuredValue.Text -> structuredValue.value.trim()
          else -> throw IllegalArgumentException("$key must be encoded as text")
        }
        if (value.isBlank()) {
          throw IllegalArgumentException("$key cannot be blank")
        }
        value
      }
    }
  }

  private fun mapCategory(
    result: InterpretationResult,
    issues: MutableList<MovementEntryDraftIssue>,
  ): String? {
    val categoryField = result.fields.firstOrNull { it.key == FieldKey.of("categoryId") } ?: return null
    val interpretation = categoryField.interpretation
    return when (interpretation) {
      FieldInterpretation.Missing -> {
        issues += issue(MovementEntryDraftField.CATEGORY_ID, MovementEntryDraftIssueCode.FIELD_MISSING)
        null
      }
      is FieldInterpretation.Ambiguous -> {
        issues += issue(MovementEntryDraftField.CATEGORY_ID, MovementEntryDraftIssueCode.FIELD_AMBIGUOUS)
        null
      }
      is FieldInterpretation.Resolved -> {
        val candidate = interpretation.candidate
        if (candidate.confidence.value < minimumConfidence) {
          issues += issue(MovementEntryDraftField.CATEGORY_ID, MovementEntryDraftIssueCode.CONFIDENCE_INSUFFICIENT)
          return null
        }
        val value = candidate.value as? StructuredValue.Enum
          ?: throw IllegalArgumentException("categoryId must be encoded as an enum")
        value.stableValue
      }
    }
  }

  private fun interpretationFor(result: InterpretationResult, key: String): FieldInterpretation = result.fields
    .firstOrNull { it.key == FieldKey.of(key) }
    ?.interpretation
    ?: throw IllegalArgumentException("interpretation result is missing field $key")

  private fun fieldFromKey(key: dev.solidcoder.interpretation.domain.FieldKey): MovementEntryDraftField? = when (key.value) {
    "type" -> MovementEntryDraftField.TYPE
    "amount" -> MovementEntryDraftField.AMOUNT
    "occurredOn" -> MovementEntryDraftField.OCCURRED_ON
    "note" -> MovementEntryDraftField.NOTE
    "categoryId" -> MovementEntryDraftField.CATEGORY_ID
    else -> null
  }

  private fun issue(field: MovementEntryDraftField, code: MovementEntryDraftIssueCode) = MovementEntryDraftIssue(field, code)
}
