package com.gonezo.domain.budgeting.events

import java.util.UUID

data class ReservationCreated(
  val reservationId: UUID,
)
