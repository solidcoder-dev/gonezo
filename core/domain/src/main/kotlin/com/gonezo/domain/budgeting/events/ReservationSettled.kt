package com.gonezo.domain.budgeting.events

import java.util.UUID

data class ReservationSettled(
  val reservationId: UUID,
  val transactionId: UUID,
)
