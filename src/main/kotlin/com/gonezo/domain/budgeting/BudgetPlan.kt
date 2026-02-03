package com.gonezo.domain.budgeting

import java.util.UUID

data class BudgetPlan(
  val id: UUID,
  val userId: UUID,
  val period: String,
  val negativePolicy: String,
  val reservationPolicy: String,
  val effectiveDatingPolicy: String,
)
