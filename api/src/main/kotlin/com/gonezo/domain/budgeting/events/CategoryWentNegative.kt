package com.gonezo.domain.budgeting.events

import com.gonezo.domain.shared.Money
import java.util.UUID

data class CategoryWentNegative(
  val budgetPeriodId: UUID,
  val categoryId: UUID,
  val available: Money,
)
