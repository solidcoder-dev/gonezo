package com.gonezo.application.services
import com.gonezo.application.ClosePeriodCommand
import com.gonezo.application.ClosePeriodUC
import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.domain.budgeting.events.PeriodClosed
import com.gonezo.domain.budgeting.events.ReservationCancelled
import com.gonezo.domain.budgeting.ReservationStatus
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.budgeting.ports.BudgetReservationRepository
import com.gonezo.domain.budgeting.services.PeriodClosingService
class ClosePeriodService(
  private val periodClosingService: PeriodClosingService,
  private val budgetReservationRepository: BudgetReservationRepository,
  private val budgetPeriodRepository: BudgetPeriodRepository,
  private val reservationBalanceService: ReservationBalanceService,
  private val domainEventPublisher: DomainEventPublisher,
) : ClosePeriodUC {
  override fun execute(command: ClosePeriodCommand) {
    val period = budgetPeriodRepository.get(command.periodId)
    val activeReservations = budgetReservationRepository.listActiveByPeriod(command.periodId)
    val updated = periodClosingService.close(period, activeReservations)
    updated.forEach { reservation ->
      if (reservation.status == ReservationStatus.CANCELLED) {
        val original = activeReservations.firstOrNull { it.id == reservation.id }
        if (original != null) {
          reservationBalanceService.applyReservationCancelled(original)
          domainEventPublisher.publish(ReservationCancelled(original.id))
        }
      }
      budgetReservationRepository.save(reservation)
    }
    domainEventPublisher.publish(PeriodClosed(period.id))
  }
}
