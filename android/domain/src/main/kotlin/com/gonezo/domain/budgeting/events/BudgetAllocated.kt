package com.gonezo.domain.budgeting.events

import java.util.UUID

data class BudgetAllocated(
  val budgetPeriodId: UUID,
)
