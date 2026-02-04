package com.gonezo.application.services

import com.gonezo.application.CreatePeriodReservationsCommand
import com.gonezo.application.CreatePeriodReservationsUC
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.budgeting.ports.BudgetReservationRepository
import com.gonezo.domain.budgeting.ports.RecurringPatternRepository
import com.gonezo.domain.budgeting.services.ReservationService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CreatePeriodReservationsService(
  private val reservationService: ReservationService,
  private val recurringPatternRepository: RecurringPatternRepository,
  private val budgetReservationRepository: BudgetReservationRepository,
  private val budgetPeriodRepository: BudgetPeriodRepository,
  private val reservationBalanceService: ReservationBalanceService,
) : CreatePeriodReservationsUC {

  @Transactional
  override fun execute(command: CreatePeriodReservationsCommand) {
    val period = budgetPeriodRepository.get(command.periodId)
    val patterns = recurringPatternRepository.listActiveByPlan(period.budgetPlanId)

    val reservations = reservationService.createReservations(period, patterns)
    reservations.forEach { reservation ->
      val existing = budgetReservationRepository.findByPeriodAndPattern(
        periodId = period.id,
        patternId = reservation.patternId,
      )

      if (existing == null) {
        budgetReservationRepository.save(reservation)
        reservationBalanceService.applyReservationCreated(reservation)
      }
    }
  }
}
