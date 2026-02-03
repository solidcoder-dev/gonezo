package com.gonezo.application.services

import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.BudgetReservation
import com.gonezo.domain.budgeting.RecurringPattern
import com.gonezo.domain.budgeting.services.ReservationService
import com.gonezo.domain.shared.Money
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Service
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
        status = "active",
        expectedEffectiveDate = expectedDate,
        linkedTransactionId = null,
      )
    }
  }

  override fun settleReservation(
    reservation: BudgetReservation,
    transactionId: UUID,
  ): BudgetReservation {
    if (reservation.status == "settled") return reservation

    return reservation.copy(
      status = "settled",
      linkedTransactionId = transactionId,
    )
  }
}
