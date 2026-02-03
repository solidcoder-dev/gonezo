package com.gonezo.domain.budgeting

import com.gonezo.domain.shared.Money
import java.util.UUID

data class Category(
  val id: UUID,
  val budgetPlanId: UUID,
  val name: String,
  val type: String,
  val allowNegative: Boolean,
  val maxDebtAmount: Money?,
)
