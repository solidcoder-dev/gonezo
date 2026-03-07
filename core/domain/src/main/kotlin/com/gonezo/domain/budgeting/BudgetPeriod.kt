package com.gonezo.domain.budgeting

import com.gonezo.domain.shared.Money
import com.gonezo.domain.shared.YearMonth
import java.util.UUID

data class BudgetPeriod(
  val id: UUID,
  val budgetPlanId: UUID,
  val yearMonth: YearMonth,
  val incomeTotal: Money,
  val remainder: Money,
)
