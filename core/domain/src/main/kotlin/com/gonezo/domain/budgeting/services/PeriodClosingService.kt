package com.gonezo.domain.budgeting.services

import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.BudgetReservation

interface PeriodClosingService {
  fun close(period: BudgetPeriod, reservations: List<BudgetReservation>): List<BudgetReservation>
}
