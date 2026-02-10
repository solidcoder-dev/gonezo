package com.gonezo.application

import java.util.UUID

data class SettleReservationFromTxCommand(
  val reservationId: UUID,
  val transactionId: UUID,
)

interface SettleReservationFromTxUC {
  fun execute(command: SettleReservationFromTxCommand)
}
