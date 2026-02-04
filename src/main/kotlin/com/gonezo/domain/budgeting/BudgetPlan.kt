package com.gonezo.domain.budgeting

import com.gonezo.domain.shared.PolicyViolationException
import java.util.UUID

data class BudgetPlan(
  val id: UUID,
  val userId: UUID,
  val period: BudgetPlanPeriod,
  val negativePolicy: NegativePolicy,
  val reservationPolicy: ReservationPolicy,
  val effectiveDatingPolicy: EffectiveDatingPolicy,
) {
  fun requireMonthlyPeriod() {
    if (period != BudgetPlanPeriod.MONTHLY) {
      throw PolicyViolationException("Only monthly budget plans are supported.")
    }
  }
}
