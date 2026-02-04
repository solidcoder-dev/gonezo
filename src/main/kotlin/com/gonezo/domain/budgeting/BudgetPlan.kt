package com.gonezo.domain.budgeting

import java.util.UUID

data class BudgetPlan(
  val id: UUID,
  val userId: UUID,
  val period: BudgetPlanPeriod,
  val negativePolicy: NegativePolicy,
  val reservationPolicy: ReservationPolicy,
  val effectiveDatingPolicy: EffectiveDatingPolicy,
)
