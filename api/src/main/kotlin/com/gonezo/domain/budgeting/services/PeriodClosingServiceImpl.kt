package com.gonezo.domain.budgeting.services

import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.BudgetReservation
import com.gonezo.domain.budgeting.ProrationType
import com.gonezo.domain.budgeting.RecurringCadence
import com.gonezo.domain.budgeting.ReservationStatus
import com.gonezo.domain.budgeting.ports.RecurringPatternRepository

class PeriodClosingServiceImpl(
  private val recurringPatternRepository: RecurringPatternRepository,
) : PeriodClosingService {

  override fun close(period: BudgetPeriod, reservations: List<BudgetReservation>): List<BudgetReservation> {
    val patterns = recurringPatternRepository
      .listActiveByPlan(period.budgetPlanId)
      .associateBy { it.id }

    return reservations.map { reservation ->
      if (reservation.status == ReservationStatus.ACTIVE) {
        val pattern = patterns[reservation.patternId]
        val keepActive = pattern != null &&
          pattern.cadence == RecurringCadence.YEARLY &&
          pattern.proration == ProrationType.MONTHLY &&
          pattern.billingMonth != null &&
          period.yearMonth.month != pattern.billingMonth

        if (keepActive) reservation else reservation.copy(status = ReservationStatus.CANCELLED)
      } else {
        reservation
      }
    }
  }
}
