package com.gonezo.domain.budgeting.events

import java.util.UUID

data class PeriodClosed(
  val budgetPeriodId: UUID,
)
