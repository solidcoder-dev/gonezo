package com.gonezo.domain.budgeting.services

import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.BudgetReservation
import com.gonezo.domain.budgeting.RecurringPattern
import java.util.UUID

interface ReservationService {
  fun createReservations(
    period: BudgetPeriod,
    patterns: List<RecurringPattern>,
  ): List<BudgetReservation>

  fun settleReservation(
    reservation: BudgetReservation,
    transactionId: UUID,
  ): BudgetReservation
}
