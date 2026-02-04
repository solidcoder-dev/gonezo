package com.gonezo.application.services

import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.BudgetReservation
import com.gonezo.domain.budgeting.ports.RecurringPatternRepository
import com.gonezo.domain.budgeting.services.PeriodClosingService
import org.springframework.stereotype.Service

@Service
class PeriodClosingServiceImpl(
  private val recurringPatternRepository: RecurringPatternRepository,
) : PeriodClosingService {

  override fun close(period: BudgetPeriod, reservations: List<BudgetReservation>): List<BudgetReservation> {
    val patterns = recurringPatternRepository
      .listActiveByPlan(period.budgetPlanId)
      .associateBy { it.id }

    return reservations.map { reservation ->
      if (reservation.status == "active") {
        val pattern = patterns[reservation.patternId]
        val keepActive = pattern != null &&
          pattern.cadence == "yearly" &&
          pattern.proration == "monthly" &&
          pattern.billingMonth != null &&
          period.yearMonth.month != pattern.billingMonth

        if (keepActive) reservation else reservation.copy(status = "cancelled")
      } else {
        reservation
      }
    }
  }
}
