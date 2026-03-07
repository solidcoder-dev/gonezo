package com.gonezo.domain.budgeting.services

import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.BudgetReservation
import com.gonezo.domain.budgeting.RecurringPattern
import com.gonezo.domain.budgeting.ReservationStatus
import com.gonezo.domain.shared.Money
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class ReservationServiceImpl : ReservationService {

  override fun createReservations(
    period: BudgetPeriod,
    patterns: List<RecurringPattern>,
  ): List<BudgetReservation> {
    return patterns.map { pattern ->
      val expectedDate = LocalDate.of(
        period.yearMonth.year,
        period.yearMonth.month,
        pattern.billingDay ?: 1,
      )

      BudgetReservation(
        id = UUID.randomUUID(),
        budgetPeriodId = period.id,
        patternId = pattern.id,
        categoryId = pattern.categoryId,
        amount = Money(pattern.expectedAmount.amount, pattern.expectedAmount.currency),
        status = ReservationStatus.ACTIVE,
        expectedEffectiveDate = expectedDate,
        linkedTransactionId = null,
      )
    }
  }

  override fun settleReservation(
    reservation: BudgetReservation,
    transactionId: UUID,
  ): BudgetReservation {
    if (reservation.status == ReservationStatus.SETTLED) return reservation

    return reservation.copy(
      status = ReservationStatus.SETTLED,
      linkedTransactionId = transactionId,
    )
  }
}
