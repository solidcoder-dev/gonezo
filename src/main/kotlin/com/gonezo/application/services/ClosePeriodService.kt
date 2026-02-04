package com.gonezo.application.services

import com.gonezo.application.ClosePeriodCommand
import com.gonezo.application.ClosePeriodUC
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.budgeting.ports.BudgetReservationRepository
import com.gonezo.domain.budgeting.services.PeriodClosingService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ClosePeriodService(
  private val periodClosingService: PeriodClosingService,
  private val budgetReservationRepository: BudgetReservationRepository,
  private val budgetPeriodRepository: BudgetPeriodRepository,
  private val reservationBalanceService: ReservationBalanceService,
) : ClosePeriodUC {

  @Transactional
  override fun execute(command: ClosePeriodCommand) {
    val period = budgetPeriodRepository.get(command.periodId)
    val activeReservations = budgetReservationRepository.listActiveByPeriod(command.periodId)

    val updated = periodClosingService.close(period, activeReservations)
    updated.forEach { reservation ->
      if (reservation.status == "cancelled") {
        val original = activeReservations.firstOrNull { it.id == reservation.id }
        if (original != null) {
          reservationBalanceService.applyReservationCancelled(original)
        }
      }
      budgetReservationRepository.save(reservation)
    }
  }
}
