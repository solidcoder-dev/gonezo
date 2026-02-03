package com.gonezo.application.services

import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.BudgetReservation
import com.gonezo.domain.budgeting.services.PeriodClosingService
import org.springframework.stereotype.Service

@Service
class PeriodClosingServiceImpl : PeriodClosingService {

  override fun close(period: BudgetPeriod, reservations: List<BudgetReservation>): List<BudgetReservation> {
    return reservations.map { reservation ->
      if (reservation.status == "active") {
        reservation.copy(status = "cancelled")
      } else {
        reservation
      }
    }
  }
}
