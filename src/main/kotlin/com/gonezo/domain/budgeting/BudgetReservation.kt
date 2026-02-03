package com.gonezo.domain.budgeting

import com.gonezo.domain.shared.Money
import java.time.LocalDate
import java.util.UUID

data class BudgetReservation(
  val id: UUID,
  val budgetPeriodId: UUID,
  val patternId: UUID,
  val categoryId: UUID,
  val amount: Money,
  val status: String,
  val expectedEffectiveDate: LocalDate,
  val linkedTransactionId: UUID?,
)
