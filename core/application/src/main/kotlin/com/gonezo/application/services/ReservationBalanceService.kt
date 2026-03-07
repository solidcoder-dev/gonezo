package com.gonezo.application.services

import com.gonezo.domain.budgeting.BudgetReservation
import com.gonezo.domain.budgeting.CategoryBalance
import com.gonezo.domain.budgeting.ports.CategoryBalanceRepository
import com.gonezo.domain.shared.Money
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

@Service
class ReservationBalanceService(
  private val categoryBalanceRepository: CategoryBalanceRepository,
) {

  fun applyReservationCreated(reservation: BudgetReservation) {
    applyReservationDelta(reservation, reservation.amount.amount)
  }

  fun applyReservationSettled(reservation: BudgetReservation) {
    applyReservationDelta(reservation, reservation.amount.amount.negate())
  }

  fun applyReservationCancelled(reservation: BudgetReservation) {
    applyReservationDelta(reservation, reservation.amount.amount.negate())
  }

  private fun applyReservationDelta(reservation: BudgetReservation, delta: BigDecimal) {
    val existing = categoryBalanceRepository.findByPeriodAndCategory(
      periodId = reservation.budgetPeriodId,
      categoryId = reservation.categoryId,
    )

    val currency = existing?.available?.currency ?: reservation.amount.currency
    val zero = Money(BigDecimal.ZERO.setScale(2), currency)

    val base = existing ?: CategoryBalance(
      id = UUID.randomUUID(),
      budgetPeriodId = reservation.budgetPeriodId,
      categoryId = reservation.categoryId,
      openingBalance = zero,
      allocated = zero,
      spent = zero,
      available = zero,
      reserved = zero,
      safeToSpend = zero,
    )

    val newReservedAmount = base.reserved.amount.add(delta).setScale(2, RoundingMode.HALF_UP)
    val newReserved = Money(newReservedAmount, currency)
    val newSafeToSpendAmount = base.available.amount.subtract(newReservedAmount).setScale(2, RoundingMode.HALF_UP)
    val newSafeToSpend = Money(newSafeToSpendAmount, currency)

    val updated = base.copy(
      reserved = newReserved,
      safeToSpend = newSafeToSpend,
    )

    categoryBalanceRepository.save(updated)
  }
}
