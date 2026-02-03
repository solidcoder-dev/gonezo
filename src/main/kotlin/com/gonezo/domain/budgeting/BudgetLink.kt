package com.gonezo.domain.budgeting

import com.gonezo.domain.shared.Money
import java.util.UUID

data class BudgetLink(
  val id: UUID,
  val budgetPeriodId: UUID,
  val categoryId: UUID,
  val linkedType: String,
  val linkedId: UUID,
  val budgetImpactAmount: Money,
)
