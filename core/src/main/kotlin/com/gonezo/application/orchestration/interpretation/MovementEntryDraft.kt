package com.gonezo.application.orchestration.interpretation

import java.math.BigDecimal
import java.time.LocalDate

enum class MovementEntryDraftType {
  EXPENSE,
  INCOME,
}

enum class MovementEntryDraftField {
  TYPE,
  AMOUNT,
  OCCURRED_ON,
  NOTE,
  CATEGORY_ID,
}

enum class MovementEntryDraftIssueCode {
  FIELD_MISSING,
  FIELD_AMBIGUOUS,
  CONFIDENCE_INSUFFICIENT,
  VALUE_INVALID,
  CATEGORY_UNAVAILABLE,
  OUTPUT_INCOMPATIBLE,
  UNEXPECTED_FIELD,
}

data class MovementEntryDraftIssue(
  val field: MovementEntryDraftField? = null,
  val code: MovementEntryDraftIssueCode,
)

data class MovementEntryDraft(
  val type: MovementEntryDraftType? = null,
  val amount: BigDecimal? = null,
  val occurredOn: LocalDate? = null,
  val note: String? = null,
  val categoryId: String? = null,
  val issues: List<MovementEntryDraftIssue> = emptyList(),
)
