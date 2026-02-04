package com.gonezo.application.services

import com.gonezo.application.SettleReservationFromTxCommand
import com.gonezo.application.SettleReservationFromTxUC
import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.domain.budgeting.events.ReservationSettled
import com.gonezo.domain.budgeting.ports.BudgetReservationRepository
import com.gonezo.domain.budgeting.services.ReservationService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class SettleReservationFromTxService(
  private val reservationService: ReservationService,
  private val reservationRepository: BudgetReservationRepository,
  private val reservationBalanceService: ReservationBalanceService,
  private val domainEventPublisher: DomainEventPublisher,
) : SettleReservationFromTxUC {

  @Transactional
  override fun execute(command: SettleReservationFromTxCommand) {
    val reservation = reservationRepository.get(command.reservationId)
    val settled = reservationService.settleReservation(reservation, command.transactionId)
    reservationRepository.save(settled)

    if (reservation.status != settled.status) {
      reservationBalanceService.applyReservationSettled(reservation)
      domainEventPublisher.publish(ReservationSettled(reservation.id, command.transactionId))
    }
  }
}
