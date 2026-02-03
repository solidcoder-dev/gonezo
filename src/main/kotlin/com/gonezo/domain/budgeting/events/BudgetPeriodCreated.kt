package com.gonezo.domain.budgeting.events

import com.gonezo.domain.shared.YearMonth
import java.util.UUID

data class BudgetPeriodCreated(
  val budgetPeriodId: UUID,
  val yearMonth: YearMonth,
)
