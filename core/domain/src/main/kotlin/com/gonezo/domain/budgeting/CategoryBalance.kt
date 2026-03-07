package com.gonezo.domain.budgeting

import com.gonezo.domain.shared.Money
import java.util.UUID

data class CategoryBalance(
  val id: UUID,
  val budgetPeriodId: UUID,
  val categoryId: UUID,
  val openingBalance: Money,
  val allocated: Money,
  val spent: Money,
  val available: Money,
  val reserved: Money,
  val safeToSpend: Money,
)
